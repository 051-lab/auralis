import { describe, expect, it } from 'vitest';
import type { SharedPresetPayload } from '@/store/useAuralisStore';
import { decodeSharedPreset, encodeLegacySharedPreset, encodeSharedPreset } from './sharePreset';

const payload: SharedPresetPayload = {
  version: 1,
  name: 'Share Test',
  oscillators: [{ frequency: 528, gain: 0.4, pan: -1 }],
  masterFX: {
    masterVolume: 0.6,
    reverbWet: 0.1,
    reverbDecay: 6,
    autoPannerRate: 0,
    autoPannerDepth: 0,
  },
  noiseEnabled: true,
  noiseType: 'brown',
  noiseGain: 0.1,
  createdAt: 1,
};

describe('share preset encoding', () => {
  it('round-trips compressed presets', () => {
    const encoded = encodeSharedPreset(payload);

    expect(encoded.startsWith('v2.')).toBe(true);
    expect(decodeSharedPreset(encoded)).toEqual(payload);
  });

  it('decodes legacy base64 JSON presets', () => {
    const legacy = encodeLegacySharedPreset(payload);

    expect(decodeSharedPreset(legacy)).toEqual(payload);
  });
});
