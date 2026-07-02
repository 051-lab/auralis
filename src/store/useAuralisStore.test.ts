import { describe, expect, it } from 'vitest';
import {
  CURRENT_PRESET_VERSION,
  getEffectiveOscillatorGain,
  normalizeMasterFX,
  normalizeNoiseHighpassFrequency,
  normalizeNoiseLowpassFrequency,
  normalizeNoiseStereoWidth,
  normalizeOscillators,
  normalizePresetTags,
} from './useAuralisStore';

describe('store normalization', () => {
  it('normalizes missing master FX fields with current defaults', () => {
    expect(normalizeMasterFX({ reverbWet: 2, autoPannerRate: -1 })).toEqual({
      masterVolume: 0.6,
      reverbWet: 1,
      reverbDecay: 6,
      autoPannerRate: 0,
      autoPannerDepth: 0.5,
    });
  });

  it('normalizes oscillator arrays to four safe oscillator states', () => {
    const oscillators = normalizeOscillators([
      {
        frequency: 50000,
        gain: -1,
        waveform: 'triangle',
        pan: 3,
        muted: true,
        soloed: true,
        tremoloRate: 100,
        tremoloDepth: 2,
      },
    ]);

    expect(oscillators).toHaveLength(4);
    expect(oscillators[0]).toMatchObject({
      frequency: 20000,
      gain: 0,
      waveform: 'triangle',
      pan: 1,
      muted: true,
      soloed: true,
      tremoloRate: 30,
      tremoloDepth: 1,
    });
    expect(oscillators[1]).toMatchObject({
      gain: 0.35,
      muted: false,
      soloed: false,
    });
    expect(oscillators[1].frequency).toBe(300);
  });

  it('derives effective gain without overwriting stored gain values', () => {
    const [audible, muted, soloed] = normalizeOscillators([
      { gain: 0.4 },
      { gain: 0.7, muted: true },
      { gain: 0.5, soloed: true },
    ]);

    expect(getEffectiveOscillatorGain(audible, false)).toBe(0.4);
    expect(getEffectiveOscillatorGain(muted, false)).toBe(0);
    expect(getEffectiveOscillatorGain(audible, true)).toBe(0);
    expect(getEffectiveOscillatorGain(soloed, true)).toBe(0.5);
  });

  it('normalizes noise filter cutoff ranges', () => {
    expect(normalizeNoiseHighpassFrequency(undefined)).toBe(20);
    expect(normalizeNoiseHighpassFrequency(5)).toBe(20);
    expect(normalizeNoiseHighpassFrequency(250)).toBe(250);
    expect(normalizeNoiseHighpassFrequency(800)).toBe(500);

    expect(normalizeNoiseLowpassFrequency(undefined)).toBe(12000);
    expect(normalizeNoiseLowpassFrequency(100)).toBe(500);
    expect(normalizeNoiseLowpassFrequency(6400)).toBe(6400);
    expect(normalizeNoiseLowpassFrequency(20000)).toBe(12000);

    expect(normalizeNoiseStereoWidth(undefined)).toBe(0.5);
    expect(normalizeNoiseStereoWidth(-1)).toBe(0);
    expect(normalizeNoiseStereoWidth(0.65)).toBe(0.65);
    expect(normalizeNoiseStereoWidth(2)).toBe(1);
  });

  it('normalizes preset tags to a compact unique list', () => {
    expect(
      normalizePresetTags(['Focus', ' focus ', 'Meditation', '', 12, 'VeryLongPresetTagNameBeyondLimit'])
    ).toEqual(['focus', 'meditation', 'verylongpresettagnamebey']);
  });

  it('exposes the current preset version', () => {
    expect(CURRENT_PRESET_VERSION).toBe(1);
  });
});
