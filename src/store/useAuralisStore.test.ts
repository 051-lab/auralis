import { describe, expect, it } from 'vitest';
import { CURRENT_PRESET_VERSION, normalizeMasterFX, normalizeOscillators } from './useAuralisStore';

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
      tremoloRate: 30,
      tremoloDepth: 1,
    });
    expect(oscillators[1].frequency).toBe(300);
  });

  it('exposes the current preset version', () => {
    expect(CURRENT_PRESET_VERSION).toBe(1);
  });
});
