import { describe, expect, it } from 'vitest';
import {
  analyzeSignal,
  analyzeStereo,
  channelCorrelation,
  maximumChannelDelta,
} from './audioQualification';

describe('audioQualification', () => {
  it('returns zeroed metrics for empty input', () => {
    expect(analyzeSignal(new Float32Array())).toEqual({
      sampleCount: 0,
      peak: 0,
      rms: 0,
      dcOffset: 0,
      clippingCount: 0,
      nonFiniteCount: 0,
    });
  });

  it('counts and excludes non-finite samples from signal calculations', () => {
    expect(analyzeSignal([0.5, Number.NaN, Number.POSITIVE_INFINITY, -0.5])).toEqual({
      sampleCount: 4,
      peak: 0.5,
      rms: 0.5,
      dcOffset: 0,
      clippingCount: 0,
      nonFiniteCount: 2,
    });
  });

  it('calculates peak, RMS, DC offset, and clipping count', () => {
    const metrics = analyzeSignal([1, -1, 0.5, 0.5]);

    expect(metrics.peak).toBe(1);
    expect(metrics.rms).toBeCloseTo(Math.sqrt(2.5 / 4), 12);
    expect(metrics.dcOffset).toBe(0.25);
    expect(metrics.clippingCount).toBe(2);
    expect(metrics.nonFiniteCount).toBe(0);
  });

  it('calculates maximum channel delta', () => {
    expect(maximumChannelDelta([0.1, -0.2, 0.3], [0.1, -0.1, 0.25])).toBeCloseTo(0.1, 12);
    expect(maximumChannelDelta([0, Number.NaN], [0, 0])).toBe(Number.POSITIVE_INFINITY);
  });

  it('rejects unequal channel lengths consistently', () => {
    const left = [0, 0.25];
    const right = [0];
    const expectedMessage = 'Channel lengths must match (left: 2, right: 1)';

    expect(() => maximumChannelDelta(left, right)).toThrowError(
      new RangeError(expectedMessage),
    );
    expect(() => channelCorrelation(left, right)).toThrowError(
      new RangeError(expectedMessage),
    );
    expect(() => analyzeStereo(left, right)).toThrowError(
      new RangeError(expectedMessage),
    );
  });

  it('calculates channel correlation', () => {
    const channel = [1, 0, -1, 0];

    expect(channelCorrelation(channel, channel)).toBeCloseTo(1, 12);
    expect(channelCorrelation(channel, channel.map((sample) => -sample))).toBeCloseTo(-1, 12);
    expect(channelCorrelation([], [])).toBe(0);
    expect(channelCorrelation([0, Number.NaN], [0, 0])).toBe(0);
  });

  it('combines per-channel and stereo metrics', () => {
    const metrics = analyzeStereo([0.25, -0.25], [0.25, -0.25]);

    expect(metrics.left.peak).toBe(0.25);
    expect(metrics.right.rms).toBe(0.25);
    expect(metrics.maximumChannelDelta).toBe(0);
    expect(metrics.correlation).toBe(1);
  });
});
