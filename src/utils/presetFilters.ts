import type { Preset } from '@/store/useAuralisStore';

export type PresetCategory =
  | 'all'
  | 'sleep'
  | 'focus'
  | 'meditation'
  | 'relaxation'
  | 'ambience'
  | 'drone'
  | 'binaural'
  | 'texture'
  | 'custom';

export interface PresetCategoryOption {
  value: PresetCategory;
  label: string;
}

export const PRESET_CATEGORY_OPTIONS: PresetCategoryOption[] = [
  { value: 'all', label: 'All' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'focus', label: 'Focus' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'ambience', label: 'Ambience' },
  { value: 'drone', label: 'Drone' },
  { value: 'binaural', label: 'Binaural' },
  { value: 'texture', label: 'Texture' },
  { value: 'custom', label: 'Custom' },
];

const categoryTerms: Record<Exclude<PresetCategory, 'all' | 'custom'>, string[]> = {
  sleep: ['sleep', 'delta', 'wind-down', 'rest'],
  focus: ['focus', 'alpha', 'attention', 'reading', 'gamma'],
  meditation: ['meditation', 'theta', 'breathing', 'reflection', 'calm'],
  relaxation: ['relax', 'relaxation', 'unwind', 'calm', 'soft'],
  ambience: ['ambient', 'ambience', 'background', 'masking', 'noise', 'cocoon'],
  drone: ['drone', 'horizon'],
  binaural: ['binaural', 'delta', 'theta', 'alpha', 'beta', 'gamma'],
  texture: ['texture', 'rain', 'storm', 'wind', 'ocean', 'noise', 'ambient'],
};

function getSearchablePresetText(preset: Preset): string {
  return [
    preset.name,
    preset.description,
    preset.intendedUse,
    preset.caution,
    preset.tags.join(' '),
    preset.headphonesRecommended ? 'headphones binaural' : '',
    preset.textureLayer.enabled ? `${preset.textureLayer.type} texture` : '',
  ]
    .join(' ')
    .toLowerCase();
}

export function getPresetCategoryMatches(preset: Preset): Set<PresetCategory> {
  const text = getSearchablePresetText(preset);
  const matches = new Set<PresetCategory>(['all']);

  if (!preset.id.startsWith('built-in-')) {
    matches.add('custom');
  }

  PRESET_CATEGORY_OPTIONS.forEach((option) => {
    if (option.value === 'all' || option.value === 'custom') return;

    const terms = categoryTerms[option.value];

    if (terms.some((term) => text.includes(term))) {
      matches.add(option.value);
    }
  });

  return matches;
}

export function filterPresets(
  presets: Preset[],
  search: string,
  category: PresetCategory
): Preset[] {
  const normalizedSearch = search.trim().toLowerCase();

  return presets.filter((preset) => {
    const categoryMatches = getPresetCategoryMatches(preset);

    if (!categoryMatches.has(category)) return false;
    if (!normalizedSearch) return true;

    return getSearchablePresetText(preset).includes(normalizedSearch);
  });
}

export function countPresetsByCategory(
  presets: Preset[]
): Record<PresetCategory, number> {
  return PRESET_CATEGORY_OPTIONS.reduce((counts, option) => {
    counts[option.value] = presets.filter((preset) =>
      getPresetCategoryMatches(preset).has(option.value)
    ).length;

    return counts;
  }, {} as Record<PresetCategory, number>);
}
