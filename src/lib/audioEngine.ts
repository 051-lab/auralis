import * as Tone from 'tone';
import {
  DEFAULT_LIMITER_THRESHOLD_DB,
  createOutputMeter,
  createSilentOutputMeter,
} from '@/utils/audioMeter';
import type { OutputMeterReading } from '@/utils/audioMeter';
import { clamp } from '@/utils/math';

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type NoiseType = 'white' | 'pink' | 'brown';
export type RecordingMode = 'wet' | 'dry';
export type ModulationMode = 'off' | 'gentle' | 'breathing' | 'pulse' | 'drift';
export type TextureType = 'rain' | 'storm' | 'wind' | 'ocean' | 'drone';

export interface ModulationTargets {
  noiseFilter: boolean;
  noiseWidth: boolean;
  oscillatorPan: boolean;
}

export interface ModulationConfig {
  mode: ModulationMode;
  rate: number;
  depth: number;
  targets: ModulationTargets;
  allowOscillatorPan?: boolean;
}

export interface TextureLayerConfig {
  enabled: boolean;
  type: TextureType;
  gain: number;
  tone: number;
  width: number;
  motion: number;
}

const PARAM_RAMP_SECONDS = 0.05;
const START_FADE_SECONDS = 0.35;
const STOP_FADE_SECONDS = 0.6;
const NOISE_RAMP_SECONDS = 0.12;
const MIN_NOISE_HIGHPASS_FREQUENCY = 20;
const MAX_NOISE_HIGHPASS_FREQUENCY = 500;
const MIN_NOISE_LOWPASS_FREQUENCY = 500;
const MAX_NOISE_LOWPASS_FREQUENCY = 12000;
const MIN_TEXTURE_LOWPASS_FREQUENCY = 450;
const MAX_TEXTURE_LOWPASS_FREQUENCY = 10000;
const MIN_TEXTURE_HIGHPASS_FREQUENCY = 20;
const MAX_TEXTURE_HIGHPASS_FREQUENCY = 1200;
const MOTION_INTERVAL_MS = 90;

const defaultModulationConfig: ModulationConfig = {
  mode: 'off',
  rate: 0.08,
  depth: 0.25,
  targets: {
    noiseFilter: true,
    noiseWidth: true,
    oscillatorPan: false,
  },
  allowOscillatorPan: true,
};

const defaultTextureLayerConfig: TextureLayerConfig = {
  enabled: false,
  type: 'rain',
  gain: 0.12,
  tone: 0.5,
  width: 0.7,
  motion: 0.2,
};

const textureProfiles: Record<
  TextureType,
  {
    noiseType: NoiseType;
    highpassBase: number;
    lowpassBase: number;
    oscillatorFrequency: number;
    oscillatorGain: number;
    oscillatorType: WaveformType;
  }
> = {
  rain: {
    noiseType: 'pink',
    highpassBase: 260,
    lowpassBase: 8200,
    oscillatorFrequency: 90,
    oscillatorGain: 0,
    oscillatorType: 'sine',
  },
  storm: {
    noiseType: 'brown',
    highpassBase: 35,
    lowpassBase: 4200,
    oscillatorFrequency: 48,
    oscillatorGain: 0.08,
    oscillatorType: 'triangle',
  },
  wind: {
    noiseType: 'pink',
    highpassBase: 120,
    lowpassBase: 2800,
    oscillatorFrequency: 72,
    oscillatorGain: 0.02,
    oscillatorType: 'sine',
  },
  ocean: {
    noiseType: 'brown',
    highpassBase: 28,
    lowpassBase: 2200,
    oscillatorFrequency: 58,
    oscillatorGain: 0.03,
    oscillatorType: 'sine',
  },
  drone: {
    noiseType: 'brown',
    highpassBase: 24,
    lowpassBase: 1800,
    oscillatorFrequency: 72,
    oscillatorGain: 0.45,
    oscillatorType: 'triangle',
  },
};

export interface OscillatorConfig {
  index: number;
  frequency: number;
  detuneCents: number;
  gain: number;
  waveform: WaveformType;
  pan: number;
  phaseDegrees: number;
  tremoloEnabled: boolean;
  tremoloShape: WaveformType;
  tremoloRate: number;
  tremoloDepth: number;
  attackSeconds: number;
  releaseSeconds: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __auralisAudioEngine: AudioEngine | undefined;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private oscillators: Tone.Oscillator[] = [];
  private oscillatorGains: Tone.Gain[] = [];
  private oscillatorPanners: Tone.Panner[] = [];
  private tremoloLFOs: Tone.LFO[] = [];
  private tremoloGains: Tone.Gain[] = [];
  private oscillatorGainValues: number[] = [];
  private oscillatorPanValues: number[] = [];
  private oscillatorAttackValues: number[] = [];
  private oscillatorReleaseValues: number[] = [];
  private tremoloDepthValues: number[] = [];
  private tremoloEnabledStates: boolean[] = [];

  private masterGain: Tone.Gain;
  private userVolume: Tone.Gain;
  private transportFade: Tone.Volume;
  private reverb: Tone.Reverb;
  private autoPanner: Tone.AutoPanner;
  private eq: Tone.EQ3;
  private delay: Tone.FeedbackDelay;
  private chorus: Tone.Chorus;
  private masterStereoWidener: Tone.StereoWidener;
  private limiter: Tone.Limiter;
  private dryRecorderLimiter: Tone.Limiter;
  private analyser: Tone.Analyser;
  private wetRecorder: Tone.Recorder;
  private dryRecorder: Tone.Recorder;
  private activeRecorder: Tone.Recorder | null = null;
  private activeRecordingMode: RecordingMode = 'wet';

  private noise: Tone.Noise;
  private noiseGain: Tone.Gain;
  private noiseHighpassFilter: Tone.Filter;
  private noiseLowpassFilter: Tone.Filter;
  private noiseStereoWidener: Tone.StereoWidener;
  private noiseStarted = false;
  private currentNoiseType: NoiseType = 'brown';
  private currentNoiseGain = 0.2;
  private currentNoiseHighpassFrequency = MIN_NOISE_HIGHPASS_FREQUENCY;
  private currentNoiseLowpassFrequency = MAX_NOISE_LOWPASS_FREQUENCY;
  private currentNoiseStereoWidth = 0.5;

  private textureNoise: Tone.Noise;
  private textureOscillator: Tone.Oscillator;
  private textureNoiseGain: Tone.Gain;
  private textureOscillatorGain: Tone.Gain;
  private textureGain: Tone.Gain;
  private textureHighpassFilter: Tone.Filter;
  private textureLowpassFilter: Tone.Filter;
  private textureStereoWidener: Tone.StereoWidener;
  private textureSourcesStarted = false;
  private textureConfig: TextureLayerConfig = { ...defaultTextureLayerConfig };
  private textureBaseHighpassFrequency = textureProfiles.rain.highpassBase;
  private textureBaseLowpassFrequency = textureProfiles.rain.lowpassBase;
  private textureMotionInterval: ReturnType<typeof globalThis.setInterval> | null = null;
  private textureMotionPhase = 0;
  private textureLastMotionTimestamp = 0;

  private modulationConfig: ModulationConfig = { ...defaultModulationConfig };
  private modulationInterval: ReturnType<typeof globalThis.setInterval> | null = null;
  private modulationPhase = 0;
  private modulationLastTimestamp = 0;

  private isStarted = false;
  private oscillatorSourcesStarted = false;
  private isRecording = false;
  private fadeToken = 0;

  private constructor() {
    this.masterGain = new Tone.Gain(0.8);
    this.userVolume = new Tone.Gain(0.6);
    this.transportFade = new Tone.Volume(-Infinity);
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.3 });
    this.autoPanner = new Tone.AutoPanner({ frequency: 0.2, depth: 0.5 });
    this.eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    this.delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.2, wet: 0 });
    this.chorus = new Tone.Chorus({ frequency: 0.8, depth: 0.2, wet: 0 });
    this.masterStereoWidener = new Tone.StereoWidener(0.5);
    this.limiter = new Tone.Limiter(DEFAULT_LIMITER_THRESHOLD_DB);
    this.dryRecorderLimiter = new Tone.Limiter(DEFAULT_LIMITER_THRESHOLD_DB);
    this.analyser = new Tone.Analyser('waveform', 2048);
    this.wetRecorder = new Tone.Recorder();
    this.dryRecorder = new Tone.Recorder();

    this.noise = new Tone.Noise(this.currentNoiseType);
    this.noiseGain = new Tone.Gain(0);
    this.noiseHighpassFilter = new Tone.Filter({
      type: 'highpass',
      frequency: MIN_NOISE_HIGHPASS_FREQUENCY,
      rolloff: -12,
    });
    this.noiseLowpassFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: MAX_NOISE_LOWPASS_FREQUENCY,
      rolloff: -12,
    });
    this.noiseStereoWidener = new Tone.StereoWidener(0.5);
    this.textureNoise = new Tone.Noise(textureProfiles.rain.noiseType);
    this.textureOscillator = new Tone.Oscillator({
      type: textureProfiles.rain.oscillatorType,
      frequency: textureProfiles.rain.oscillatorFrequency,
      volume: 0,
    });
    this.textureNoiseGain = new Tone.Gain(1);
    this.textureOscillatorGain = new Tone.Gain(0);
    this.textureGain = new Tone.Gain(0);
    this.textureHighpassFilter = new Tone.Filter({
      type: 'highpass',
      frequency: textureProfiles.rain.highpassBase,
      rolloff: -12,
    });
    this.textureLowpassFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: textureProfiles.rain.lowpassBase,
      rolloff: -12,
    });
    this.textureStereoWidener = new Tone.StereoWidener(defaultTextureLayerConfig.width);

    this.masterGain.connect(this.userVolume);
    this.userVolume.connect(this.transportFade);
    this.transportFade.connect(this.reverb);
    this.transportFade.connect(this.dryRecorderLimiter);
    this.dryRecorderLimiter.connect(this.dryRecorder);
    this.reverb.connect(this.autoPanner);
    this.autoPanner.connect(this.eq);
    this.eq.connect(this.delay);
    this.delay.connect(this.chorus);
    this.chorus.connect(this.masterStereoWidener);
    this.masterStereoWidener.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(Tone.Destination);
    this.limiter.connect(this.wetRecorder);

    this.noise.connect(this.noiseGain);
    this.noiseGain.connect(this.noiseHighpassFilter);
    this.noiseHighpassFilter.connect(this.noiseLowpassFilter);
    this.noiseLowpassFilter.connect(this.noiseStereoWidener);
    this.noiseStereoWidener.connect(this.masterGain);

    this.textureNoise.connect(this.textureNoiseGain);
    this.textureNoiseGain.connect(this.textureHighpassFilter);
    this.textureHighpassFilter.connect(this.textureLowpassFilter);
    this.textureLowpassFilter.connect(this.textureGain);
    this.textureOscillator.connect(this.textureOscillatorGain);
    this.textureOscillatorGain.connect(this.textureGain);
    this.textureGain.connect(this.textureStereoWidener);
    this.textureStereoWidener.connect(this.masterGain);

    for (let i = 0; i < 4; i += 1) {
      this.createOscillatorChannel(i);
    }

    this.chorus.start();
  }

  public static getInstance(): AudioEngine {
    if (process.env.NODE_ENV !== 'production' && globalThis.__auralisAudioEngine) {
      AudioEngine.instance = globalThis.__auralisAudioEngine;
      return globalThis.__auralisAudioEngine;
    }

    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();

      if (process.env.NODE_ENV !== 'production') {
        globalThis.__auralisAudioEngine = AudioEngine.instance;
      }
    }

    return AudioEngine.instance;
  }

  private createOscillatorChannel(index: number): void {
    const oscillator = new Tone.Oscillator({
      type: 'sine',
      frequency: 200 + index * 100,
      volume: 0,
    });

    const panner = new Tone.Panner(0);
    const gain = new Tone.Gain(0.5);
    const tremoloGain = new Tone.Gain(1);
    const lfo = new Tone.LFO({ frequency: 2, min: 0.7, max: 1 });

    oscillator.connect(panner);
    panner.connect(gain);
    gain.connect(tremoloGain);
    tremoloGain.connect(this.masterGain);

    this.oscillators[index] = oscillator;
    this.oscillatorPanners[index] = panner;
    this.oscillatorGains[index] = gain;
    this.tremoloGains[index] = tremoloGain;
    this.tremoloLFOs[index] = lfo;
    this.oscillatorGainValues[index] = 0.5;
    this.oscillatorPanValues[index] = 0;
    this.oscillatorAttackValues[index] = 0.02;
    this.oscillatorReleaseValues[index] = 0.2;
    this.tremoloDepthValues[index] = 0.3;
    this.tremoloEnabledStates[index] = false;
  }

  public async start(): Promise<void> {
    await Tone.start();

    if (!this.oscillatorSourcesStarted) {
      this.oscillators.forEach((oscillator) => {
        oscillator.start();
      });
      this.oscillatorSourcesStarted = true;
    }

    this.fadeToken += 1;
    this.transportFade.volume.cancelScheduledValues(Tone.now());
    this.transportFade.volume.rampTo(0, START_FADE_SECONDS);
    this.isStarted = true;

    if (this.textureConfig.enabled && this.textureConfig.gain > 0) {
      this.startTextureLayer();
    }
  }

  public stop(): void {
    if (!this.isStarted) return;

    this.fadeToken += 1;
    this.transportFade.volume.cancelScheduledValues(Tone.now());
    this.transportFade.volume.rampTo(-Infinity, STOP_FADE_SECONDS);
    this.stopNoise(STOP_FADE_SECONDS);
    this.stopTextureLayer(STOP_FADE_SECONDS);
    this.isStarted = false;
  }

  public async fadeOutAndStop(duration: number = 10): Promise<boolean> {
    if (!this.isStarted) return false;

    const token = this.fadeToken + 1;
    this.fadeToken = token;
    this.transportFade.volume.cancelScheduledValues(Tone.now());
    const fadeDuration = Math.max(STOP_FADE_SECONDS, duration);
    this.transportFade.volume.rampTo(-Infinity, fadeDuration);
    this.stopNoise(fadeDuration);
    this.stopTextureLayer(fadeDuration);

    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, fadeDuration * 1000);
    });

    if (this.fadeToken === token) {
      this.isStarted = false;
      return true;
    }

    return false;
  }

  public async startRecording(mode: RecordingMode = 'wet'): Promise<void> {
    if (this.isRecording) return;

    this.activeRecordingMode = mode;
    this.activeRecorder = mode === 'dry' ? this.dryRecorder : this.wetRecorder;
    this.activeRecorder.start();
    this.isRecording = true;
  }

  public async stopRecording(): Promise<Blob> {
    if (!this.isRecording || !this.activeRecorder) {
      throw new Error('Not recording');
    }

    const recording = await this.activeRecorder.stop();
    this.activeRecorder = null;
    this.isRecording = false;
    return recording;
  }

  public getRecordingMode(): RecordingMode {
    return this.activeRecordingMode;
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public setMasterVolume(volume: number): void {
    this.userVolume.gain.rampTo(clamp(volume, 0, 1), PARAM_RAMP_SECONDS);
  }

  public setLimiterThreshold(thresholdDb: number): void {
    this.limiter.threshold.rampTo(clamp(thresholdDb, -12, -0.1), PARAM_RAMP_SECONDS);
    this.dryRecorderLimiter.threshold.rampTo(clamp(thresholdDb, -12, -0.1), PARAM_RAMP_SECONDS);
  }

  public setFrequency(index: number, freq: number): void {
    const oscillator = this.oscillators[index];
    if (!oscillator) return;

    oscillator.frequency.rampTo(clamp(freq, 20, 20000), PARAM_RAMP_SECONDS);
  }

  public setDetune(index: number, detuneCents: number): void {
    const oscillator = this.oscillators[index];
    if (!oscillator) return;

    oscillator.detune.rampTo(clamp(detuneCents, -1200, 1200), PARAM_RAMP_SECONDS);
  }

  public setGain(index: number, gain: number): void {
    const oscillatorGain = this.oscillatorGains[index];
    if (!oscillatorGain) return;

    const safeGain = clamp(gain, 0, 1);
    const currentGain = this.oscillatorGainValues[index] ?? 0;
    const rampSeconds =
      safeGain > currentGain
        ? this.oscillatorAttackValues[index] ?? PARAM_RAMP_SECONDS
        : this.oscillatorReleaseValues[index] ?? PARAM_RAMP_SECONDS;

    this.oscillatorGainValues[index] = safeGain;
    oscillatorGain.gain.rampTo(safeGain, clamp(rampSeconds, PARAM_RAMP_SECONDS, 10));
  }

  public setWaveform(index: number, waveform: WaveformType): void {
    const oscillator = this.oscillators[index];
    if (!oscillator) return;

    oscillator.type = waveform;
  }

  public setPhase(index: number, phaseDegrees: number): void {
    const oscillator = this.oscillators[index];
    if (!oscillator) return;

    oscillator.phase = clamp(phaseDegrees, 0, 360);
  }

  public setPan(index: number, pan: number): void {
    const panner = this.oscillatorPanners[index];
    if (!panner) return;

    const safePan = clamp(pan, -1, 1);
    this.oscillatorPanValues[index] = safePan;
    panner.pan.rampTo(safePan, PARAM_RAMP_SECONDS);
  }

  public setTremoloEnabled(index: number, enabled: boolean): void {
    const lfo = this.tremoloLFOs[index];
    const tremoloGain = this.tremoloGains[index];

    if (!lfo || !tremoloGain) return;
    if (this.tremoloEnabledStates[index] === enabled) return;

    if (enabled) {
      this.configureTremoloRange(index);
      lfo.connect(tremoloGain.gain);
      lfo.start();
      this.tremoloEnabledStates[index] = true;
      return;
    }

    lfo.stop();
    lfo.disconnect();
    tremoloGain.gain.cancelScheduledValues(Tone.now());
    tremoloGain.gain.rampTo(1, PARAM_RAMP_SECONDS);
    this.tremoloEnabledStates[index] = false;
  }

  public setTremoloRate(index: number, rate: number): void {
    const lfo = this.tremoloLFOs[index];
    if (!lfo) return;

    lfo.frequency.rampTo(clamp(rate, 0.1, 30), PARAM_RAMP_SECONDS);
  }

  public setTremoloShape(index: number, shape: WaveformType): void {
    const lfo = this.tremoloLFOs[index];
    if (!lfo) return;

    lfo.type = shape;
  }

  public setTremoloDepth(index: number, depth: number): void {
    this.tremoloDepthValues[index] = clamp(depth, 0, 1);
    this.configureTremoloRange(index);
  }

  public setEnvelope(index: number, attackSeconds: number, releaseSeconds: number): void {
    this.oscillatorAttackValues[index] = clamp(attackSeconds, 0.001, 5);
    this.oscillatorReleaseValues[index] = clamp(releaseSeconds, 0.01, 10);
  }

  private configureTremoloRange(index: number): void {
    const lfo = this.tremoloLFOs[index];
    if (!lfo) return;

    const depth = this.tremoloDepthValues[index] ?? 0;
    lfo.min = 1 - depth;
    lfo.max = 1;
  }

  public setReverbWet(wet: number): void {
    this.reverb.wet.rampTo(clamp(wet, 0, 1), PARAM_RAMP_SECONDS);
  }

  public setReverbDecay(decay: number): void {
    this.reverb.decay = clamp(decay, 0.2, 12);
    this.reverb.generate();
  }

  public setReverbPreDelay(preDelay: number): void {
    this.reverb.preDelay = clamp(preDelay, 0, 0.5);
    this.reverb.generate();
  }

  public setAutoPannerRate(rate: number): void {
    this.autoPanner.frequency.rampTo(clamp(rate, 0, 20), PARAM_RAMP_SECONDS);
  }

  public setAutoPannerDepth(depth: number): void {
    this.autoPanner.depth.rampTo(clamp(depth, 0, 1), PARAM_RAMP_SECONDS);
  }

  public setEq(enabled: boolean, lowGain: number, midGain: number, highGain: number): void {
    this.eq.low.rampTo(enabled ? clamp(lowGain, -12, 12) : 0, PARAM_RAMP_SECONDS);
    this.eq.mid.rampTo(enabled ? clamp(midGain, -12, 12) : 0, PARAM_RAMP_SECONDS);
    this.eq.high.rampTo(enabled ? clamp(highGain, -12, 12) : 0, PARAM_RAMP_SECONDS);
  }

  public setMasterStereoWidth(width: number): void {
    this.masterStereoWidener.width.rampTo(clamp(width, 0, 1), PARAM_RAMP_SECONDS);
  }

  public setDelay(enabled: boolean, wet: number, delayTime: number, feedback: number): void {
    this.delay.wet.rampTo(enabled ? clamp(wet, 0, 1) : 0, PARAM_RAMP_SECONDS);
    this.delay.delayTime.rampTo(clamp(delayTime, 0.01, 1), PARAM_RAMP_SECONDS);
    this.delay.feedback.rampTo(clamp(feedback, 0, 0.9), PARAM_RAMP_SECONDS);
  }

  public setChorus(enabled: boolean, wet: number, rate: number, depth: number): void {
    this.chorus.wet.rampTo(enabled ? clamp(wet, 0, 1) : 0, PARAM_RAMP_SECONDS);
    this.chorus.frequency.rampTo(clamp(rate, 0.05, 8), PARAM_RAMP_SECONDS);
    this.chorus.depth = clamp(depth, 0, 1);
  }

  public setNoiseType(type: NoiseType): void {
    this.currentNoiseType = type;
    this.noise.type = type;
  }

  public setNoiseGain(gain: number): void {
    this.currentNoiseGain = clamp(gain, 0, 1);

    if (this.isStarted && this.noiseStarted) {
      this.noiseGain.gain.rampTo(this.currentNoiseGain, PARAM_RAMP_SECONDS);
    }
  }

  public setNoiseHighpassFrequency(frequency: number): void {
    this.currentNoiseHighpassFrequency = clamp(
      frequency,
      MIN_NOISE_HIGHPASS_FREQUENCY,
      MAX_NOISE_HIGHPASS_FREQUENCY
    );
    this.noiseHighpassFilter.frequency.rampTo(this.currentNoiseHighpassFrequency, PARAM_RAMP_SECONDS);
  }

  public setNoiseLowpassFrequency(frequency: number): void {
    this.currentNoiseLowpassFrequency = clamp(
      frequency,
      MIN_NOISE_LOWPASS_FREQUENCY,
      MAX_NOISE_LOWPASS_FREQUENCY
    );
    this.noiseLowpassFilter.frequency.rampTo(this.currentNoiseLowpassFrequency, PARAM_RAMP_SECONDS);
  }

  public setNoiseStereoWidth(width: number): void {
    this.currentNoiseStereoWidth = clamp(width, 0, 1);
    this.noiseStereoWidener.width.rampTo(this.currentNoiseStereoWidth, PARAM_RAMP_SECONDS);
  }

  public startNoise(): void {
    if (!this.noiseStarted) {
      this.noise.start();
      this.noiseStarted = true;
    }

    this.noiseGain.gain.rampTo(this.currentNoiseGain, NOISE_RAMP_SECONDS);
  }

  public stopNoise(duration: number = NOISE_RAMP_SECONDS): void {
    this.noiseGain.gain.rampTo(0, Math.max(NOISE_RAMP_SECONDS, duration));
  }

  public setTextureLayer(config: TextureLayerConfig): void {
    this.textureConfig = {
      enabled: Boolean(config.enabled),
      type: textureProfiles[config.type] ? config.type : defaultTextureLayerConfig.type,
      gain: clamp(config.gain, 0, 1),
      tone: clamp(config.tone, 0, 1),
      width: clamp(config.width, 0, 1),
      motion: clamp(config.motion, 0, 1),
    };

    const profile = textureProfiles[this.textureConfig.type];
    const toneOffset = (this.textureConfig.tone - 0.5) * 2;
    const highpassFrequency = profile.highpassBase * (1 + toneOffset * 0.45);
    const lowpassFrequency = profile.lowpassBase * (1 + toneOffset * 0.35);

    this.textureBaseHighpassFrequency = clamp(
      highpassFrequency,
      MIN_TEXTURE_HIGHPASS_FREQUENCY,
      MAX_TEXTURE_HIGHPASS_FREQUENCY
    );
    this.textureBaseLowpassFrequency = clamp(
      lowpassFrequency,
      MIN_TEXTURE_LOWPASS_FREQUENCY,
      MAX_TEXTURE_LOWPASS_FREQUENCY
    );

    this.textureNoise.type = profile.noiseType;
    this.textureOscillator.type = profile.oscillatorType;
    this.textureOscillator.frequency.rampTo(profile.oscillatorFrequency, PARAM_RAMP_SECONDS);
    this.textureOscillatorGain.gain.rampTo(
      profile.oscillatorGain * this.textureConfig.gain,
      PARAM_RAMP_SECONDS
    );
    this.textureHighpassFilter.frequency.rampTo(this.textureBaseHighpassFrequency, PARAM_RAMP_SECONDS);
    this.textureLowpassFilter.frequency.rampTo(this.textureBaseLowpassFrequency, PARAM_RAMP_SECONDS);
    this.textureStereoWidener.width.rampTo(this.textureConfig.width, PARAM_RAMP_SECONDS);

    if (this.isStarted && this.textureConfig.enabled && this.textureConfig.gain > 0) {
      this.startTextureLayer();
    } else {
      this.stopTextureLayer();
    }

    this.configureTextureMotion();
  }

  private startTextureLayer(): void {
    if (!this.textureSourcesStarted) {
      this.textureNoise.start();
      this.textureOscillator.start();
      this.textureSourcesStarted = true;
    }

    this.textureGain.gain.rampTo(this.textureConfig.gain, NOISE_RAMP_SECONDS);
    this.configureTextureMotion();
  }

  private stopTextureLayer(duration: number = NOISE_RAMP_SECONDS): void {
    this.textureGain.gain.rampTo(0, Math.max(NOISE_RAMP_SECONDS, duration));
    this.stopTextureMotion();
  }

  public setModulation(config: ModulationConfig): void {
    this.modulationConfig = {
      mode: config.mode,
      rate: clamp(config.rate, 0.01, 1),
      depth: clamp(config.depth, 0, 1),
      targets: {
        noiseFilter: Boolean(config.targets.noiseFilter),
        noiseWidth: Boolean(config.targets.noiseWidth),
        oscillatorPan: Boolean(config.targets.oscillatorPan),
      },
      allowOscillatorPan: config.allowOscillatorPan !== false,
    };

    this.configureModulation();
  }

  private configureModulation(): void {
    if (!this.isModulationActive()) {
      this.stopModulation();
      return;
    }

    if (this.modulationInterval) return;

    this.modulationLastTimestamp = performance.now();
    this.modulationInterval = globalThis.setInterval(() => {
      this.applyModulationTick();
    }, MOTION_INTERVAL_MS);
  }

  private isModulationActive(): boolean {
    const targets = this.modulationConfig.targets;

    return (
      this.modulationConfig.mode !== 'off' &&
      this.modulationConfig.depth > 0 &&
      (targets.noiseFilter || targets.noiseWidth || targets.oscillatorPan)
    );
  }

  private stopModulation(): void {
    if (this.modulationInterval) {
      globalThis.clearInterval(this.modulationInterval);
      this.modulationInterval = null;
    }

    this.noiseHighpassFilter.frequency.rampTo(this.currentNoiseHighpassFrequency, PARAM_RAMP_SECONDS);
    this.noiseLowpassFilter.frequency.rampTo(this.currentNoiseLowpassFrequency, PARAM_RAMP_SECONDS);
    this.noiseStereoWidener.width.rampTo(this.currentNoiseStereoWidth, PARAM_RAMP_SECONDS);
    this.oscillatorPanners.forEach((panner, index) => {
      panner.pan.rampTo(this.oscillatorPanValues[index] ?? 0, PARAM_RAMP_SECONDS);
    });
  }

  private getMotionShape(phase: number, mode: ModulationMode): number {
    const sine = Math.sin(phase);

    if (mode === 'pulse') return Math.tanh(sine * 2.5);
    if (mode === 'breathing') return Math.sin(phase - Math.PI / 2);
    if (mode === 'drift') return Math.sin(phase * 0.5) * 0.7 + Math.sin(phase * 0.13) * 0.3;

    return sine;
  }

  private applyModulationTick(): void {
    if (!this.isModulationActive()) {
      this.stopModulation();
      return;
    }

    const now = performance.now();
    const elapsedSeconds = Math.max(0, (now - this.modulationLastTimestamp) / 1000);
    this.modulationLastTimestamp = now;
    this.modulationPhase += Math.PI * 2 * this.modulationConfig.rate * elapsedSeconds;

    const shape = this.getMotionShape(this.modulationPhase, this.modulationConfig.mode);
    const depth = this.modulationConfig.depth;

    if (this.modulationConfig.targets.noiseFilter) {
      const highpassOffset = shape * depth * 90;
      const lowpassOffset = shape * depth * 2600;

      this.noiseHighpassFilter.frequency.rampTo(
        clamp(
          this.currentNoiseHighpassFrequency + highpassOffset,
          MIN_NOISE_HIGHPASS_FREQUENCY,
          MAX_NOISE_HIGHPASS_FREQUENCY
        ),
        MOTION_INTERVAL_MS / 1000
      );
      this.noiseLowpassFilter.frequency.rampTo(
        clamp(
          this.currentNoiseLowpassFrequency + lowpassOffset,
          MIN_NOISE_LOWPASS_FREQUENCY,
          MAX_NOISE_LOWPASS_FREQUENCY
        ),
        MOTION_INTERVAL_MS / 1000
      );
    }

    if (this.modulationConfig.targets.noiseWidth) {
      this.noiseStereoWidener.width.rampTo(
        clamp(this.currentNoiseStereoWidth + shape * depth * 0.28, 0, 1),
        MOTION_INTERVAL_MS / 1000
      );
    }

    if (this.modulationConfig.targets.oscillatorPan && this.modulationConfig.allowOscillatorPan) {
      this.oscillatorPanners.forEach((panner, index) => {
        const polarity = index % 2 === 0 ? 1 : -1;
        const basePan = this.oscillatorPanValues[index] ?? 0;

        panner.pan.rampTo(
          clamp(basePan + shape * polarity * depth * 0.18, -1, 1),
          MOTION_INTERVAL_MS / 1000
        );
      });
    }
  }

  private configureTextureMotion(): void {
    if (!this.isTextureMotionActive()) {
      this.stopTextureMotion(false);
      return;
    }

    if (this.textureMotionInterval) return;

    this.textureLastMotionTimestamp = performance.now();
    this.textureMotionInterval = globalThis.setInterval(() => {
      this.applyTextureMotionTick();
    }, MOTION_INTERVAL_MS);
  }

  private isTextureMotionActive(): boolean {
    return (
      this.isStarted &&
      this.textureConfig.enabled &&
      this.textureConfig.gain > 0 &&
      this.textureConfig.motion > 0
    );
  }

  private stopTextureMotion(restoreBase: boolean = true): void {
    if (this.textureMotionInterval) {
      globalThis.clearInterval(this.textureMotionInterval);
      this.textureMotionInterval = null;
    }

    if (restoreBase) {
      this.textureHighpassFilter.frequency.rampTo(this.textureBaseHighpassFrequency, PARAM_RAMP_SECONDS);
      this.textureLowpassFilter.frequency.rampTo(this.textureBaseLowpassFrequency, PARAM_RAMP_SECONDS);
      this.textureStereoWidener.width.rampTo(this.textureConfig.width, PARAM_RAMP_SECONDS);
    }
  }

  private applyTextureMotionTick(): void {
    if (!this.isTextureMotionActive()) {
      this.stopTextureMotion();
      return;
    }

    const now = performance.now();
    const elapsedSeconds = Math.max(0, (now - this.textureLastMotionTimestamp) / 1000);
    this.textureLastMotionTimestamp = now;
    this.textureMotionPhase += Math.PI * 2 * (0.025 + this.textureConfig.motion * 0.16) * elapsedSeconds;

    const shape = Math.sin(this.textureMotionPhase);
    const motion = this.textureConfig.motion;

    this.textureHighpassFilter.frequency.rampTo(
      clamp(
        this.textureBaseHighpassFrequency + shape * motion * 90,
        MIN_TEXTURE_HIGHPASS_FREQUENCY,
        MAX_TEXTURE_HIGHPASS_FREQUENCY
      ),
      MOTION_INTERVAL_MS / 1000
    );
    this.textureLowpassFilter.frequency.rampTo(
      clamp(
        this.textureBaseLowpassFrequency + shape * motion * 1700,
        MIN_TEXTURE_LOWPASS_FREQUENCY,
        MAX_TEXTURE_LOWPASS_FREQUENCY
      ),
      MOTION_INTERVAL_MS / 1000
    );
    this.textureStereoWidener.width.rampTo(
      clamp(this.textureConfig.width + shape * motion * 0.2, 0, 1),
      MOTION_INTERVAL_MS / 1000
    );
  }

  public getAnalyser(): Tone.Analyser {
    return this.analyser;
  }

  public getOutputMeter(): OutputMeterReading {
    if (!this.isStarted) {
      return createSilentOutputMeter();
    }

    try {
      const analyserValue = this.analyser.getValue();

      if (typeof analyserValue === 'number') {
        return createOutputMeter([analyserValue], {
          limiterThresholdDb: DEFAULT_LIMITER_THRESHOLD_DB,
        });
      }

      return createOutputMeter(analyserValue as ArrayLike<number>, {
        limiterThresholdDb: DEFAULT_LIMITER_THRESHOLD_DB,
      });
    } catch {
      return createSilentOutputMeter();
    }
  }

  public isRunning(): boolean {
    return this.isStarted;
  }
}

export const getAudioEngine = (): AudioEngine => AudioEngine.getInstance();
