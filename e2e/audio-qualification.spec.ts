import { expect, test, type Page } from '@playwright/test';
import {
  analyzeSignal,
  analyzeStereo,
} from '../src/utils/audioQualification';

const SAMPLE_RATES = [44_100, 48_000] as const;
const AMPLITUDE = 0.25;

type RenderedChannels = {
  left: number[];
  right: number[];
};

type QualificationEvidence = Record<string, string | number>;

const TOLERANCES = {
  exactZero: 0,
  channelDelta: 1e-7,
  correlation: 0.999999,
  peak: 2e-5,
  rms: 2e-5,
  dcOffset: 1e-4,
  inactivePeak: 1e-7,
  stackedPeakMaximum: 0.40001,
  stackedRms: 5e-4,
  fadeAmplitude: 2e-5,
  fadeMonotonicity: 2e-5,
  fadeBoundaryFrames: 2,
  plateau: 2e-4,
  postFadePeak: 1e-7,
} as const;

async function renderFixture(
  page: Page,
  sampleRate: number,
  fixture: 'silence' | 'mono' | 'isolation' | 'stacked' | 'fade',
): Promise<RenderedChannels> {
  return page.evaluate(
    async ({ fixture, sampleRate }) => {
      const duration = fixture === 'fade' ? 1.35 : 1;
      const frameCount = Math.round(duration * sampleRate);
      const context = new OfflineAudioContext(2, frameCount, sampleRate);

      const connectMonoToStereo = (source: AudioNode): void => {
        const merger = context.createChannelMerger(2);
        source.connect(merger, 0, 0);
        source.connect(merger, 0, 1);
        merger.connect(context.destination);
      };

      const createBufferSource = (samples: Float32Array): AudioBufferSourceNode => {
        const buffer = context.createBuffer(1, samples.length, sampleRate);
        buffer.getChannelData(0).set(samples);
        const source = context.createBufferSource();
        source.buffer = buffer;
        return source;
      };

      const generateSine = (
        frequency: number,
        amplitude: number,
        length = frameCount,
      ): Float32Array => {
        const samples = new Float32Array(length);
        for (let frame = 0; frame < length; frame += 1) {
          samples[frame] = amplitude * Math.sin((2 * Math.PI * frequency * frame) / sampleRate);
        }
        return samples;
      };

      if (fixture === 'silence') {
        const source = createBufferSource(new Float32Array(frameCount));
        connectMonoToStereo(source);
        source.start(0);
        source.stop(duration);
      }

      if (fixture === 'mono') {
        const source = createBufferSource(generateSine(997, 0.25));
        connectMonoToStereo(source);
        source.start(0);
      }

      if (fixture === 'isolation') {
        const merger = context.createChannelMerger(2);
        const activeFrameCount = Math.round(0.4 * sampleRate);
        const left = createBufferSource(generateSine(1_000, 0.25, activeFrameCount));
        const right = createBufferSource(generateSine(1_000, 0.25, activeFrameCount));
        left.connect(merger, 0, 0);
        right.connect(merger, 0, 1);
        merger.connect(context.destination);
        left.start(0.05);
        right.start(0.55);
      }

      if (fixture === 'stacked') {
        const samples = new Float32Array(frameCount);
        for (const frequency of [200, 300, 400, 500]) {
          const sine = generateSine(frequency, 0.1);
          for (let frame = 0; frame < frameCount; frame += 1) {
            samples[frame] += sine[frame];
          }
        }
        const source = createBufferSource(samples);
        connectMonoToStereo(source);
        source.start(0);
      }

      if (fixture === 'fade') {
        const sourceBuffer = context.createBuffer(1, frameCount, sampleRate);
        sourceBuffer.getChannelData(0).fill(1);
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = sourceBuffer;
        gain.gain.setValueAtTime(0, 0);
        gain.gain.setValueAtTime(0, 0.1);
        gain.gain.linearRampToValueAtTime(0.25, 0.45);
        gain.gain.setValueAtTime(0.25, 0.65);
        gain.gain.linearRampToValueAtTime(0, 1.25);
        source.connect(gain);
        connectMonoToStereo(gain);
        source.start(0);
        source.stop(duration);
      }

      const rendered = await context.startRendering();
      return {
        left: Array.from(rendered.getChannelData(0)),
        right: Array.from(rendered.getChannelData(1)),
      };
    },
    { fixture, sampleRate },
  );
}

function windowSamples(channel: number[], sampleRate: number, start: number, end: number) {
  return channel.slice(Math.round(start * sampleRate), Math.round(end * sampleRate));
}

function expectedFadeValue(frame: number, sampleRate: number): number {
  const time = frame / sampleRate;
  if (time <= 0.1 || time >= 1.25) {
    return 0;
  }
  if (time < 0.45) {
    return 0.25 * ((time - 0.1) / 0.35);
  }
  if (time <= 0.65) {
    return 0.25;
  }
  return 0.25 * (1 - (time - 0.65) / 0.6);
}

function firstFrameMatching(
  samples: number[],
  startFrame: number,
  predicate: (sample: number, frame: number) => boolean,
): number {
  for (let frame = startFrame; frame < samples.length; frame += 1) {
    if (predicate(samples[frame], frame)) {
      return frame;
    }
  }
  return -1;
}

function expectFrameNear(actual: number, expected: number): void {
  expect(actual).toBeGreaterThanOrEqual(0);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCES.fadeBoundaryFrames);
}

function maximumMonotonicityViolation(
  samples: number[],
  startFrame: number,
  endFrame: number,
  direction: 'rising' | 'falling',
): number {
  let maximumViolation = 0;

  for (let frame = startFrame + 1; frame <= endFrame; frame += 1) {
    const previous = samples[frame - 1];
    const current = samples[frame];
    const violation = direction === 'rising' ? previous - current : current - previous;
    maximumViolation = Math.max(maximumViolation, violation);
  }

  return maximumViolation;
}

for (const sampleRate of SAMPLE_RATES) {
  test.describe(`OfflineAudioContext qualification at ${sampleRate} Hz`, () => {
    test(`meets deterministic signal criteria`, async ({ page, browser }) => {
      const browserVersion = browser.version();
      const evidence: QualificationEvidence[] = [];

      const silence = await renderFixture(page, sampleRate, 'silence');
      const silenceMetrics = analyzeStereo(silence.left, silence.right);
      for (const channel of [silenceMetrics.left, silenceMetrics.right]) {
        expect(channel.peak).toBe(0);
        expect(channel.rms).toBe(0);
        expect(channel.dcOffset).toBe(0);
        expect(channel.clippingCount).toBe(0);
      }
      evidence.push({
        scenario: 'silence',
        browserVersion,
        sampleRate,
        peak: silenceMetrics.left.peak,
        rms: silenceMetrics.left.rms,
        dc: silenceMetrics.left.dcOffset,
        clipping: silenceMetrics.left.clippingCount,
        toleranceExactZero: TOLERANCES.exactZero,
        verdict: 'pass',
      });

      const mono = await renderFixture(page, sampleRate, 'mono');
      const monoMetrics = analyzeStereo(mono.left, mono.right);
      expect(monoMetrics.maximumChannelDelta).toBeLessThanOrEqual(1e-7);
      expect(monoMetrics.correlation).toBeGreaterThanOrEqual(0.999999);
      expect(monoMetrics.left.peak).toBeCloseTo(AMPLITUDE, 4);
      expect(Math.abs(monoMetrics.left.peak - AMPLITUDE)).toBeLessThanOrEqual(2e-5);
      expect(Math.abs(monoMetrics.left.rms - AMPLITUDE / Math.sqrt(2))).toBeLessThanOrEqual(2e-5);
      expect(Math.abs(monoMetrics.left.dcOffset)).toBeLessThanOrEqual(1e-4);
      expect(monoMetrics.left.clippingCount).toBe(0);
      expect(monoMetrics.left.nonFiniteCount).toBe(0);
      evidence.push({
        scenario: 'mono',
        browserVersion,
        sampleRate,
        peak: monoMetrics.left.peak,
        rms: monoMetrics.left.rms,
        dc: monoMetrics.left.dcOffset,
        channelDelta: monoMetrics.maximumChannelDelta,
        correlation: monoMetrics.correlation,
        tolerancePeak: TOLERANCES.peak,
        toleranceRms: TOLERANCES.rms,
        toleranceDcOffset: TOLERANCES.dcOffset,
        maximumChannelDelta: TOLERANCES.channelDelta,
        minimumCorrelation: TOLERANCES.correlation,
        verdict: 'pass',
      });

      const isolation = await renderFixture(page, sampleRate, 'isolation');
      const leftActive = analyzeSignal(windowSamples(isolation.left, sampleRate, 0.05, 0.45));
      const leftInactive = analyzeSignal(windowSamples(isolation.right, sampleRate, 0.05, 0.45));
      const rightActive = analyzeSignal(windowSamples(isolation.right, sampleRate, 0.55, 0.95));
      const rightInactive = analyzeSignal(windowSamples(isolation.left, sampleRate, 0.55, 0.95));
      for (const active of [leftActive, rightActive]) {
        expect(Math.abs(active.peak - AMPLITUDE)).toBeLessThanOrEqual(2e-5);
        expect(active.nonFiniteCount).toBe(0);
        expect(active.clippingCount).toBe(0);
      }
      for (const inactive of [leftInactive, rightInactive]) {
        expect(inactive.peak).toBeLessThanOrEqual(1e-7);
        expect(inactive.nonFiniteCount).toBe(0);
        expect(inactive.clippingCount).toBe(0);
      }
      evidence.push({
        scenario: 'stereo-isolation',
        browserVersion,
        sampleRate,
        activePeak: Math.max(leftActive.peak, rightActive.peak),
        inactivePeak: Math.max(leftInactive.peak, rightInactive.peak),
        clipping: leftActive.clippingCount + rightActive.clippingCount,
        toleranceActivePeak: TOLERANCES.peak,
        maximumInactivePeak: TOLERANCES.inactivePeak,
        verdict: 'pass',
      });

      const stacked = await renderFixture(page, sampleRate, 'stacked');
      const stackedMetrics = analyzeStereo(stacked.left, stacked.right);
      expect(stackedMetrics.left.peak).toBeLessThanOrEqual(0.40001);
      expect(Math.abs(stackedMetrics.left.rms - Math.sqrt(0.02))).toBeLessThanOrEqual(5e-4);
      expect(Math.abs(stackedMetrics.left.dcOffset)).toBeLessThanOrEqual(1e-4);
      expect(stackedMetrics.left.clippingCount).toBe(0);
      expect(stackedMetrics.left.nonFiniteCount).toBe(0);
      evidence.push({
        scenario: 'stacked',
        browserVersion,
        sampleRate,
        peak: stackedMetrics.left.peak,
        rms: stackedMetrics.left.rms,
        dc: stackedMetrics.left.dcOffset,
        clipping: stackedMetrics.left.clippingCount,
        maximumPeak: TOLERANCES.stackedPeakMaximum,
        toleranceRms: TOLERANCES.stackedRms,
        toleranceDcOffset: TOLERANCES.dcOffset,
        verdict: 'pass',
      });

      const fade = await renderFixture(page, sampleRate, 'fade');
      const preFade = analyzeSignal(windowSamples(fade.left, sampleRate, 0, 0.1));
      const plateau = windowSamples(fade.left, sampleRate, 0.45, 0.65);
      const postFade = analyzeSignal(windowSamples(fade.left, sampleRate, 1.25, 1.35));
      expect(preFade.peak).toBe(0);
      expect(postFade.peak).toBeLessThanOrEqual(1e-7);
      const perFrameErrors = fade.left.map((sample, frame) =>
        Math.abs(sample - expectedFadeValue(frame, sampleRate)),
      );
      const maximumEnvelopeError = perFrameErrors.reduce(
        (maximum, error) => Math.max(maximum, error),
        0,
      );
      expect(maximumEnvelopeError).toBeLessThanOrEqual(TOLERANCES.fadeAmplitude);

      const maximumRiseViolation = maximumMonotonicityViolation(
        fade.left,
        Math.round(0.1 * sampleRate),
        Math.round(0.45 * sampleRate),
        'rising',
      );
      const maximumFallViolation = maximumMonotonicityViolation(
        fade.left,
        Math.round(0.65 * sampleRate),
        Math.round(1.25 * sampleRate),
        'falling',
      );
      expect(maximumRiseViolation).toBeLessThanOrEqual(TOLERANCES.fadeMonotonicity);
      expect(maximumFallViolation).toBeLessThanOrEqual(TOLERANCES.fadeMonotonicity);

      const expectedRiseStart = Math.round(0.1 * sampleRate) + 1;
      const expectedPlateauStart = Math.round(0.45 * sampleRate);
      const expectedFallStart = Math.round(0.65 * sampleRate) + 1;
      const expectedSilenceStart = Math.round(1.25 * sampleRate);
      const riseStart = firstFrameMatching(
        fade.left,
        Math.round(0.1 * sampleRate) - 2,
        (sample) => sample > TOLERANCES.inactivePeak,
      );
      const plateauStart = firstFrameMatching(
        fade.left,
        Math.round(0.45 * sampleRate) - 2,
        (sample) => Math.abs(sample - 0.25) <= TOLERANCES.fadeAmplitude,
      );
      const fallStart = firstFrameMatching(
        fade.left,
        Math.round(0.65 * sampleRate),
        (sample) => sample < 0.25 - TOLERANCES.inactivePeak,
      );
      const silenceStart = firstFrameMatching(
        fade.left,
        Math.round(1.25 * sampleRate) - 2,
        (sample, frame) =>
          Math.abs(sample) <= TOLERANCES.postFadePeak &&
          fade.left.slice(frame).every((remaining) => Math.abs(remaining) <= TOLERANCES.postFadePeak),
      );
      expectFrameNear(riseStart, expectedRiseStart);
      expectFrameNear(plateauStart, expectedPlateauStart);
      expectFrameNear(fallStart, expectedFallStart);
      expectFrameNear(silenceStart, expectedSilenceStart);
      expect(analyzeStereo(fade.left, fade.right).maximumChannelDelta).toBeLessThanOrEqual(
        TOLERANCES.channelDelta,
      );
      for (const sample of plateau) {
        expect(Math.abs(sample - 0.25)).toBeLessThanOrEqual(TOLERANCES.plateau);
      }
      evidence.push({
        scenario: 'fade',
        browserVersion,
        sampleRate,
        preFadePeak: preFade.peak,
        maximumEnvelopeError,
        maximumRiseViolation,
        maximumFallViolation,
        riseStartFrame: riseStart,
        plateauStartFrame: plateauStart,
        plateauMin: Math.min(...plateau),
        plateauMax: Math.max(...plateau),
        fallStartFrame: fallStart,
        silenceStartFrame: silenceStart,
        postFadePeak: postFade.peak,
        toleranceEnvelopeAmplitude: TOLERANCES.fadeAmplitude,
        toleranceMonotonicity: TOLERANCES.fadeMonotonicity,
        toleranceBoundaryFrames: TOLERANCES.fadeBoundaryFrames,
        tolerancePlateau: TOLERANCES.plateau,
        maximumPostFadePeak: TOLERANCES.postFadePeak,
        verdict: 'pass',
      });

      console.log(
        `AUR-WO-104 evidence (${browserVersion}):\n${evidence
          .map((row) => JSON.stringify(row))
          .join('\n')}`,
      );
    });
  });
}
