import { describe, expect, it } from 'vitest';
import type { Preset } from '@/store/useAuralisStore';
import {
  countPresetsByCategory,
  filterPresets,
  getPresetCategoryMatches,
} from './presetFilters';

const basePreset: Preset = {
  id: 'built-in-base',
  version: 2,
  name: 'Base Preset',
  description: 'Base preset.',
  intendedUse: 'Custom',
  headphonesRecommended: false,
  caution: 'Start low.',
  tags: [],
  oscillators: [],
  masterFX: {
    masterVolume: 0.6,
    reverbWet: 0.1,
    reverbDecay: 6,
    autoPannerRate: 0,
    autoPannerDepth: 0,
  },
  noiseEnabled: false,
  noiseType: 'brown',
  noiseGain: 0,
  noiseHighpassFrequency: 20,
  noiseLowpassFrequency: 12000,
  noiseStereoWidth: 0.5,
  modulation: {
    mode: 'off',
    rate: 0.08,
    depth: 0.2,
    targets: {
      noiseFilter: true,
      noiseWidth: true,
      oscillatorPan: false,
    },
  },
  textureLayer: {
    enabled: false,
    type: 'rain',
    gain: 0,
    tone: 0.5,
    width: 0.5,
    motion: 0,
  },
  creatorSession: {
    title: '',
    purpose: 'Custom',
    notes: '',
    visualTheme: '',
    durationMinutes: 30,
    exportSlug: '',
  },
  createdAt: 1,
};

const createPreset = (preset: Partial<Preset>): Preset => ({
  ...basePreset,
  ...preset,
});

describe('preset filters', () => {
  it('matches categories from names, intent, tags, and texture state', () => {
    const preset = createPreset({
      name: 'Deep Drone Horizon',
      intendedUse: 'Ambient drone',
      tags: ['drone', 'ambient'],
      textureLayer: {
        ...basePreset.textureLayer,
        enabled: true,
        type: 'ocean',
      },
    });

    const matches = getPresetCategoryMatches(preset);

    expect(matches.has('drone')).toBe(true);
    expect(matches.has('ambience')).toBe(true);
    expect(matches.has('texture')).toBe(true);
  });

  it('filters presets by category and full searchable text', () => {
    const presets = [
      createPreset({
        id: 'built-in-theta',
        name: 'Theta Meditation Gate',
        intendedUse: 'Meditation',
        tags: ['theta', 'binaural'],
        headphonesRecommended: true,
      }),
      createPreset({
        id: 'preset-user-rain',
        name: 'Rain Study Bed',
        description: 'Soft background texture for reading.',
        intendedUse: 'Focus',
        tags: ['rain', 'focus'],
      }),
    ];

    expect(filterPresets(presets, 'theta', 'meditation')).toHaveLength(1);
    expect(filterPresets(presets, 'reading', 'focus')).toHaveLength(1);
    expect(filterPresets(presets, 'rain', 'custom')).toHaveLength(1);
  });

  it('counts category matches across a preset collection', () => {
    const presets = [
      createPreset({ id: 'built-in-alpha', name: 'Alpha Focus', tags: ['focus'] }),
      createPreset({ id: 'preset-custom', name: 'Soft Rain', tags: ['rain'] }),
    ];
    const counts = countPresetsByCategory(presets);

    expect(counts.all).toBe(2);
    expect(counts.focus).toBe(1);
    expect(counts.texture).toBe(1);
    expect(counts.custom).toBe(1);
  });
});
