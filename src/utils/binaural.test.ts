import { describe, expect, it } from 'vitest';
import {
  classifyBinauralBeat,
  createBinauralPair,
  getBinauralGuidance,
  normalizeBinauralBaseFrequency,
  normalizeBinauralBeatFrequency,
  parseStrictBinauralCarriers,
} from './binaural';

describe('binaural helpers', () => {
  it('classifies beat frequency ranges for responsible UI guidance', () => {
    expect(classifyBinauralBeat(2)).toBe('low');
    expect(classifyBinauralBeat(6)).toBe('common');
    expect(classifyBinauralBeat(20)).toBe('high');
    expect(classifyBinauralBeat(40)).toBe('experimental');
  });

  it('returns stable guidance copy for each classification', () => {
    expect(getBinauralGuidance(6)).toMatchObject({
      band: 'common',
      label: 'Steady',
      tone: 'emerald',
    });
    expect(getBinauralGuidance(40)).toMatchObject({
      band: 'experimental',
      label: 'Experimental',
      tone: 'violet',
    });
  });

  it('normalizes base frequency so the paired carrier stays in range', () => {
    expect(normalizeBinauralBaseFrequency(10, 6)).toBe(20);
    expect(normalizeBinauralBaseFrequency(19990, 40)).toBe(19960);
    expect(normalizeBinauralBaseFrequency(Number.NaN, 6)).toBe(400);
  });

  it('normalizes exact custom beat frequencies to the supported builder range', () => {
    expect(normalizeBinauralBeatFrequency(0.1)).toBe(0.5);
    expect(normalizeBinauralBeatFrequency(7.5)).toBe(7.5);
    expect(normalizeBinauralBeatFrequency(120)).toBe(60);
    expect(normalizeBinauralBeatFrequency(Number.NaN)).toBe(6);
  });

  it('creates a validated binaural carrier pair', () => {
    expect(createBinauralPair(400, 7.5)).toMatchObject({
      baseFrequency: 400,
      beatFrequency: 7.5,
      upperFrequency: 407.5,
      baseAdjusted: false,
      beatAdjusted: false,
    });

    expect(createBinauralPair(19990, 80)).toMatchObject({
      baseFrequency: 19940,
      beatFrequency: 60,
      upperFrequency: 20000,
      baseAdjusted: true,
      beatAdjusted: true,
    });
  });

  it('accepts only strict ordered shared binaural carriers', () => {
    expect(parseStrictBinauralCarriers([{ frequency: 200 }, { frequency: 240 }])).toMatchObject({
      baseFrequency: 200,
      upperFrequency: 240,
      beatFrequency: 40,
      baseAdjusted: false,
      beatAdjusted: false,
    });

    for (const oscillators of [
      undefined,
      [],
      [{ frequency: 200 }],
      [{ frequency: Number.NaN }, { frequency: 206 }],
      [{ frequency: 200 }, { frequency: Number.POSITIVE_INFINITY }],
      [{ frequency: 240 }, { frequency: 200 }],
      [{ frequency: 200 }, { frequency: 200.25 }],
      [{ frequency: 200 }, { frequency: 261 }],
      [{ frequency: 19 }, { frequency: 25 }],
      [{ frequency: 19_980 }, { frequency: 20_001 }],
    ]) {
      expect(parseStrictBinauralCarriers(oscillators)).toBeNull();
    }
  });
});
