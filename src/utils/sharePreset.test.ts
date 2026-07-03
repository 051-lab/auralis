import { describe, expect, it } from 'vitest';
import type { SharedPresetPayload } from '@/store/useAuralisStore';
import { decodeSharedPreset, encodeLegacySharedPreset, encodeSharedPreset } from './sharePreset';

const payload: SharedPresetPayload = {
  version: 2,
  name: 'Share Test',
  description: 'Shared preset metadata test.',
  intendedUse: 'Test session',
  headphonesRecommended: true,
  exportReady: true,
  caution: 'Use a low volume.',
  tags: ['test', 'metadata'],
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
  noiseHighpassFrequency: 40,
  noiseLowpassFrequency: 6400,
  noiseStereoWidth: 0.65,
  modulation: {
    mode: 'gentle',
    rate: 0.08,
    depth: 0.25,
    targets: {
      noiseFilter: true,
      noiseWidth: true,
      oscillatorPan: false,
    },
  },
  textureLayer: {
    enabled: true,
    type: 'rain',
    gain: 0.08,
    tone: 0.5,
    width: 0.7,
    motion: 0.2,
  },
  creatorSession: {
    title: 'Share Test',
    purpose: 'Test session',
    notes: 'Round trip the creator fields.',
    visualTheme: 'Cyan test ring',
    storyboardNotes: 'Hold on the visualizer center.',
    durationMinutes: 45,
    exportSlug: 'share-test-session',
  },
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
