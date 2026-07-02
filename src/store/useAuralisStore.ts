import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoiseType, WaveformType } from '../lib/audioEngine';
import { clampUnknown } from '@/utils/math';

export interface OscillatorState {
  frequency: number;
  gain: number;
  waveform: WaveformType;
  pan: number;
  muted: boolean;
  soloed: boolean;
  tremoloEnabled: boolean;
  tremoloRate: number;
  tremoloDepth: number;
}

export interface MasterFXState {
  masterVolume: number;
  reverbWet: number;
  reverbDecay: number;
  autoPannerRate: number;
  autoPannerDepth: number;
}

export interface SharedPresetPayload {
  version?: number;
  name?: string;
  description?: string;
  intendedUse?: string;
  headphonesRecommended?: boolean;
  caution?: string;
  tags?: string[];
  oscillators?: Partial<OscillatorState>[];
  masterFX?: Partial<MasterFXState>;
  noiseEnabled?: boolean;
  noiseType?: NoiseType;
  noiseGain?: number;
  noiseHighpassFrequency?: number;
  noiseLowpassFrequency?: number;
  noiseStereoWidth?: number;
  isBinauralMode?: boolean;
  binauralPreset?: string | null;
  createdAt?: number;
}

export interface Preset {
  id: string;
  version: number;
  name: string;
  description: string;
  intendedUse: string;
  headphonesRecommended: boolean;
  caution: string;
  tags: string[];
  oscillators: OscillatorState[];
  masterFX: MasterFXState;
  noiseEnabled: boolean;
  noiseType: NoiseType;
  noiseGain: number;
  noiseHighpassFrequency: number;
  noiseLowpassFrequency: number;
  noiseStereoWidth: number;
  createdAt: number;
}

interface AuralisState {
  oscillators: OscillatorState[];
  masterFX: MasterFXState;
  isBinauralMode: boolean;
  binauralPreset: string | null;
  presets: Preset[];
  timerDuration: number | null;
  timerRemaining: number | null;
  isRecording: boolean;
  noiseEnabled: boolean;
  noiseType: NoiseType;
  noiseGain: number;
  noiseHighpassFrequency: number;
  noiseLowpassFrequency: number;
  noiseStereoWidth: number;

  setOscillatorFrequency: (index: number, freq: number) => void;
  setOscillatorGain: (index: number, gain: number) => void;
  setOscillatorWaveform: (index: number, waveform: WaveformType) => void;
  setOscillatorPan: (index: number, pan: number) => void;
  setOscillatorMuted: (index: number, muted: boolean) => void;
  setOscillatorSoloed: (index: number, soloed: boolean) => void;
  setOscillatorTremoloEnabled: (index: number, enabled: boolean) => void;
  setOscillatorTremoloRate: (index: number, rate: number) => void;
  setOscillatorTremoloDepth: (index: number, depth: number) => void;
  setMasterVolume: (volume: number) => void;
  setReverbWet: (wet: number) => void;
  setReverbDecay: (decay: number) => void;
  setAutoPannerRate: (rate: number) => void;
  setAutoPannerDepth: (depth: number) => void;
  setBinauralMode: (enabled: boolean, presetName?: string | null) => void;
  setTimerDuration: (duration: number | null) => void;
  setTimerRemaining: (remaining: number | null) => void;
  setIsRecording: (recording: boolean) => void;
  setNoiseEnabled: (enabled: boolean) => void;
  setNoiseType: (type: NoiseType) => void;
  setNoiseGain: (gain: number) => void;
  setNoiseHighpassFrequency: (frequency: number) => void;
  setNoiseLowpassFrequency: (frequency: number) => void;
  setNoiseStereoWidth: (width: number) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  applySharedPreset: (payload: SharedPresetPayload) => void;
  resetToDefaults: () => void;
}

export const CURRENT_PRESET_VERSION = 1;
const MAX_USER_PRESETS = 50;
const MAX_PRESET_NAME_LENGTH = 80;
const MAX_PRESET_DESCRIPTION_LENGTH = 180;
const MAX_PRESET_INTENDED_USE_LENGTH = 48;
const MAX_PRESET_CAUTION_LENGTH = 160;
const MAX_PRESET_TAG_LENGTH = 24;
const MAX_PRESET_TAGS = 5;

const clamp = clampUnknown;

const isWaveformType = (value: unknown): value is WaveformType => {
  return value === 'sine' || value === 'square' || value === 'sawtooth' || value === 'triangle';
};

const isNoiseType = (value: unknown): value is NoiseType => {
  return value === 'white' || value === 'pink' || value === 'brown';
};

const defaultOscillators: OscillatorState[] = [
  {
    frequency: 200,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloRate: 2,
    tremoloDepth: 0.3,
  },
  {
    frequency: 300,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloRate: 2.5,
    tremoloDepth: 0.3,
  },
  {
    frequency: 400,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloRate: 3,
    tremoloDepth: 0.3,
  },
  {
    frequency: 500,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloRate: 3.5,
    tremoloDepth: 0.3,
  },
];

const defaultMasterFX: MasterFXState = {
  masterVolume: 0.6,
  reverbWet: 0.3,
  reverbDecay: 6,
  autoPannerRate: 0.2,
  autoPannerDepth: 0.5,
};

const defaultNoiseEnabled = false;
const defaultNoiseType: NoiseType = 'brown';
const defaultNoiseGain = 0.2;
const defaultNoiseHighpassFrequency = 20;
const defaultNoiseLowpassFrequency = 12000;
const defaultNoiseStereoWidth = 0.5;
const defaultNoiseFilter = {
  noiseHighpassFrequency: defaultNoiseHighpassFrequency,
  noiseLowpassFrequency: defaultNoiseLowpassFrequency,
  noiseStereoWidth: defaultNoiseStereoWidth,
};
const builtInPresetCreatedAt = Date.UTC(2026, 5, 29, 12);
const defaultPresetDescription = 'Custom sound session saved from the current Auralis settings.';
const defaultPresetIntendedUse = 'Custom';
const defaultPresetCaution = 'Start at low volume and stop if the sound feels uncomfortable.';
const binauralCaution =
  'Use stereo headphones for binaural designs. Effects are not guaranteed and should stay comfortable.';

const cloneOscillators = (oscillators: OscillatorState[]): OscillatorState[] => {
  return oscillators.map((oscillator) => ({ ...oscillator }));
};

const createOscillator = (
  frequency: number,
  gain: number,
  pan: number,
  waveform: WaveformType = 'sine'
): OscillatorState => ({
  frequency,
  gain,
  waveform,
  pan,
  muted: false,
  soloed: false,
  tremoloEnabled: false,
  tremoloRate: 2,
  tremoloDepth: 0.3,
});

const createPresetMetadata = (
  description: string,
  intendedUse: string,
  tags: string[],
  headphonesRecommended: boolean = false,
  caution: string = defaultPresetCaution
) => ({
  description,
  intendedUse,
  headphonesRecommended,
  caution,
  tags,
});

const builtInPresets: Preset[] = [
  {
    id: 'built-in-gamma-neural-binding-40hz',
    version: CURRENT_PRESET_VERSION,
    name: 'Gamma Neural Binding (40Hz)',
    ...createPresetMetadata(
      'A focused 40 Hz binaural-inspired pair for short, attentive listening sessions.',
      'Focused listening',
      ['gamma', 'binaural', 'focus'],
      true,
      binauralCaution
    ),
    oscillators: [
      createOscillator(200, 0.6, -1),
      createOscillator(240, 0.6, 1),
      createOscillator(400, 0, 0),
      createOscillator(500, 0, 0),
    ],
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
    ...defaultNoiseFilter,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-alpha-relaxed-focus-10hz',
    version: CURRENT_PRESET_VERSION,
    name: 'Alpha Relaxed Focus (10Hz)',
    ...createPresetMetadata(
      'A gentle 10 Hz binaural-inspired bed for calm focus without heavy movement.',
      'Calm focus',
      ['alpha', 'binaural', 'focus'],
      true,
      binauralCaution
    ),
    oscillators: [
      createOscillator(220, 0.48, -1),
      createOscillator(230, 0.48, 1),
      createOscillator(440, 0.08, 0, 'triangle'),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      masterVolume: 0.55,
      reverbWet: 0.12,
      reverbDecay: 5,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.08,
    ...defaultNoiseFilter,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-theta-meditation-6hz',
    version: CURRENT_PRESET_VERSION,
    name: 'Theta Meditation Gate (6Hz)',
    ...createPresetMetadata(
      'A soft 6 Hz binaural-inspired session designed around meditation-style listening.',
      'Meditation',
      ['theta', 'binaural', 'meditation'],
      true,
      binauralCaution
    ),
    oscillators: [
      createOscillator(180, 0.45, -1),
      createOscillator(186, 0.45, 1),
      createOscillator(360, 0.06, 0),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      masterVolume: 0.52,
      reverbWet: 0.16,
      reverbDecay: 7,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'pink',
    noiseGain: 0.12,
    ...defaultNoiseFilter,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-delta-sleep-descent-2hz',
    version: CURRENT_PRESET_VERSION,
    name: 'Delta Sleep Descent (2Hz)',
    ...createPresetMetadata(
      'A low, slow 2 Hz binaural-inspired texture for winding down before rest.',
      'Wind-down',
      ['delta', 'binaural', 'sleep'],
      true,
      binauralCaution
    ),
    oscillators: [
      createOscillator(120, 0.38, -1),
      createOscillator(122, 0.38, 1),
      createOscillator(240, 0.05, 0),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      masterVolume: 0.5,
      reverbWet: 0.18,
      reverbDecay: 8,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.15,
    noiseHighpassFrequency: 30,
    noiseLowpassFrequency: 5200,
    noiseStereoWidth: 0.35,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-soft-evening-unwind-4hz',
    version: CURRENT_PRESET_VERSION,
    name: 'Soft Evening Unwind (4Hz)',
    ...createPresetMetadata(
      'A warm low-frequency bed with filtered brown noise for relaxed evening listening.',
      'Relaxation',
      ['relax', 'brown-noise', 'unwind'],
      true,
      binauralCaution
    ),
    oscillators: [
      createOscillator(174, 0.34, -1),
      createOscillator(178, 0.34, 1),
      createOscillator(87, 0.1, 0, 'triangle'),
      createOscillator(348, 0.04, 0, 'sine'),
    ],
    masterFX: {
      masterVolume: 0.46,
      reverbWet: 0.2,
      reverbDecay: 8,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.14,
    noiseHighpassFrequency: 35,
    noiseLowpassFrequency: 4800,
    noiseStereoWidth: 0.35,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-calm-breathing-bed-6hz',
    version: CURRENT_PRESET_VERSION,
    name: 'Calm Breathing Bed (6Hz)',
    ...createPresetMetadata(
      'A slow, spacious pink-noise bed intended to sit under breathing or quiet reflection.',
      'Breathing',
      ['calm', 'pink-noise', 'meditation'],
      true,
      binauralCaution
    ),
    oscillators: [
      createOscillator(196, 0.36, -0.9),
      createOscillator(202, 0.36, 0.9),
      createOscillator(392, 0.07, 0, 'triangle'),
      createOscillator(98, 0.08, 0, 'sine'),
    ],
    masterFX: {
      masterVolume: 0.48,
      reverbWet: 0.18,
      reverbDecay: 7,
      autoPannerRate: 0.04,
      autoPannerDepth: 0.04,
    },
    noiseEnabled: true,
    noiseType: 'pink',
    noiseGain: 0.1,
    noiseHighpassFrequency: 45,
    noiseLowpassFrequency: 6400,
    noiseStereoWidth: 0.45,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-alpha-lantern-10hz',
    version: CURRENT_PRESET_VERSION,
    name: 'Alpha Lantern (10Hz)',
    ...createPresetMetadata(
      'A brighter 10 Hz binaural-inspired preset for relaxed attention and reading.',
      'Relaxed attention',
      ['alpha', 'focus', 'reading'],
      true,
      binauralCaution
    ),
    oscillators: [
      createOscillator(210, 0.4, -1),
      createOscillator(220, 0.4, 1),
      createOscillator(420, 0.06, 0, 'triangle'),
      createOscillator(315, 0.04, 0, 'sine'),
    ],
    masterFX: {
      masterVolume: 0.5,
      reverbWet: 0.14,
      reverbDecay: 5.5,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.07,
    noiseHighpassFrequency: 40,
    noiseLowpassFrequency: 7600,
    noiseStereoWidth: 0.35,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-deep-drone-horizon',
    version: CURRENT_PRESET_VERSION,
    name: 'Deep Drone Horizon',
    ...createPresetMetadata(
      'A non-binaural low drone with soft brown noise for spacious ambient listening.',
      'Ambient drone',
      ['drone', 'ambient', 'brown-noise']
    ),
    oscillators: [
      createOscillator(96, 0.28, -0.45, 'sine'),
      createOscillator(144, 0.22, 0.45, 'triangle'),
      createOscillator(192, 0.12, 0, 'sine'),
      createOscillator(288, 0.05, 0, 'triangle'),
    ],
    masterFX: {
      masterVolume: 0.44,
      reverbWet: 0.24,
      reverbDecay: 9,
      autoPannerRate: 0.05,
      autoPannerDepth: 0.08,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.12,
    noiseHighpassFrequency: 28,
    noiseLowpassFrequency: 4200,
    noiseStereoWidth: 0.65,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-soft-noise-cocoon',
    version: CURRENT_PRESET_VERSION,
    name: 'Soft Noise Cocoon',
    ...createPresetMetadata(
      'A filtered pink-noise cushion with very light tones for background masking.',
      'Background texture',
      ['noise', 'masking', 'soft']
    ),
    oscillators: [
      createOscillator(220, 0.12, -0.35, 'triangle'),
      createOscillator(330, 0.08, 0.35, 'triangle'),
      createOscillator(440, 0.04, 0, 'sine'),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      masterVolume: 0.42,
      reverbWet: 0.12,
      reverbDecay: 6.5,
      autoPannerRate: 0.03,
      autoPannerDepth: 0.05,
    },
    noiseEnabled: true,
    noiseType: 'pink',
    noiseGain: 0.18,
    noiseHighpassFrequency: 60,
    noiseLowpassFrequency: 3600,
    noiseStereoWidth: 0.7,
    createdAt: builtInPresetCreatedAt,
  },
];

const mergePresets = (incomingPresets: Preset[] = []): Preset[] => {
  const mergedPresets = [...builtInPresets];
  const existingIds = new Set(mergedPresets.map((preset) => preset.id));

  incomingPresets.forEach((preset) => {
    const normalizedPreset = normalizePreset(preset);

    if (!existingIds.has(normalizedPreset.id)) {
      mergedPresets.push(normalizedPreset);
      existingIds.add(normalizedPreset.id);
    }
  });

  const builtIns = mergedPresets.filter((preset) => preset.id.startsWith('built-in-'));
  const userPresets = mergedPresets
    .filter((preset) => !preset.id.startsWith('built-in-'))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_USER_PRESETS);

  return [...builtIns, ...userPresets];
};

export const normalizeOscillators = (
  incomingOscillators?: Partial<OscillatorState>[]
): OscillatorState[] => {
  return defaultOscillators.map((defaultOscillator, index) => {
    const incoming = incomingOscillators?.[index] ?? {};

    return {
      frequency: clamp(incoming.frequency, 20, 20000, defaultOscillator.frequency),
      gain: clamp(incoming.gain, 0, 1, defaultOscillator.gain),
      waveform: isWaveformType(incoming.waveform) ? incoming.waveform : defaultOscillator.waveform,
      pan: clamp(incoming.pan, -1, 1, defaultOscillator.pan),
      muted: typeof incoming.muted === 'boolean' ? incoming.muted : defaultOscillator.muted,
      soloed: typeof incoming.soloed === 'boolean' ? incoming.soloed : defaultOscillator.soloed,
      tremoloEnabled:
        typeof incoming.tremoloEnabled === 'boolean'
          ? incoming.tremoloEnabled
          : defaultOscillator.tremoloEnabled,
      tremoloRate: clamp(incoming.tremoloRate, 0.1, 30, defaultOscillator.tremoloRate),
      tremoloDepth: clamp(incoming.tremoloDepth, 0, 1, defaultOscillator.tremoloDepth),
    };
  });
};

export const normalizeMasterFX = (incomingMasterFX?: Partial<MasterFXState>): MasterFXState => {
  return {
    masterVolume: clamp(incomingMasterFX?.masterVolume, 0, 1, defaultMasterFX.masterVolume),
    reverbWet: clamp(incomingMasterFX?.reverbWet, 0, 1, defaultMasterFX.reverbWet),
    reverbDecay: clamp(incomingMasterFX?.reverbDecay, 0.2, 12, defaultMasterFX.reverbDecay),
    autoPannerRate: clamp(
      incomingMasterFX?.autoPannerRate,
      0,
      20,
      defaultMasterFX.autoPannerRate
    ),
    autoPannerDepth: clamp(
      incomingMasterFX?.autoPannerDepth,
      0,
      1,
      defaultMasterFX.autoPannerDepth
    ),
  };
};

export const normalizeNoiseHighpassFrequency = (frequency: unknown): number => {
  return clamp(frequency, 20, 500, defaultNoiseHighpassFrequency);
};

export const normalizeNoiseLowpassFrequency = (frequency: unknown): number => {
  return clamp(frequency, 500, 12000, defaultNoiseLowpassFrequency);
};

export const normalizeNoiseStereoWidth = (width: unknown): number => {
  return clamp(width, 0, 1, defaultNoiseStereoWidth);
};

export const getEffectiveOscillatorGain = (
  oscillator: OscillatorState,
  hasSoloedOscillator: boolean
): number => {
  if (oscillator.muted) return 0;
  if (hasSoloedOscillator && !oscillator.soloed) return 0;

  return oscillator.gain;
};

const normalizePresetName = (name: unknown): string => {
  const fallback = 'Untitled Preset';
  if (typeof name !== 'string') return fallback;

  const trimmedName = name.trim();
  if (!trimmedName) return fallback;

  return trimmedName.slice(0, MAX_PRESET_NAME_LENGTH);
};

const normalizeLimitedText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') return fallback;

  const trimmedValue = value.trim();
  if (!trimmedValue) return fallback;

  return trimmedValue.slice(0, maxLength);
};

export const normalizePresetTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];

  const normalizedTags = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase().slice(0, MAX_PRESET_TAG_LENGTH))
    .filter(Boolean);

  return Array.from(new Set(normalizedTags)).slice(0, MAX_PRESET_TAGS);
};

const normalizePreset = (preset: Partial<Preset>): Preset => {
  return {
    id: typeof preset.id === 'string' && preset.id ? preset.id : `preset-${Date.now()}`,
    version: CURRENT_PRESET_VERSION,
    name: normalizePresetName(preset.name),
    description: normalizeLimitedText(
      preset.description,
      defaultPresetDescription,
      MAX_PRESET_DESCRIPTION_LENGTH
    ),
    intendedUse: normalizeLimitedText(
      preset.intendedUse,
      defaultPresetIntendedUse,
      MAX_PRESET_INTENDED_USE_LENGTH
    ),
    headphonesRecommended:
      typeof preset.headphonesRecommended === 'boolean' ? preset.headphonesRecommended : false,
    caution: normalizeLimitedText(
      preset.caution,
      defaultPresetCaution,
      MAX_PRESET_CAUTION_LENGTH
    ),
    tags: normalizePresetTags(preset.tags),
    oscillators: normalizeOscillators(preset.oscillators),
    masterFX: normalizeMasterFX(preset.masterFX),
    noiseEnabled:
      typeof preset.noiseEnabled === 'boolean' ? preset.noiseEnabled : defaultNoiseEnabled,
    noiseType: isNoiseType(preset.noiseType) ? preset.noiseType : defaultNoiseType,
    noiseGain: clamp(preset.noiseGain, 0, 1, defaultNoiseGain),
    noiseHighpassFrequency: normalizeNoiseHighpassFrequency(preset.noiseHighpassFrequency),
    noiseLowpassFrequency: normalizeNoiseLowpassFrequency(preset.noiseLowpassFrequency),
    noiseStereoWidth: normalizeNoiseStereoWidth(preset.noiseStereoWidth),
    createdAt: clamp(preset.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
};

const normalizeUserPresets = (presets: Preset[]): Preset[] => {
  return presets
    .filter((preset) => !preset.id.startsWith('built-in-'))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_USER_PRESETS);
};

export const useAuralisStore = create<AuralisState>()(
  persist(
    (set, get) => ({
      oscillators: cloneOscillators(defaultOscillators),
      masterFX: { ...defaultMasterFX },
      isBinauralMode: false,
      binauralPreset: null,
      presets: mergePresets(),
      timerDuration: null,
      timerRemaining: null,
      isRecording: false,
      noiseEnabled: defaultNoiseEnabled,
      noiseType: defaultNoiseType,
      noiseGain: defaultNoiseGain,
      noiseHighpassFrequency: defaultNoiseHighpassFrequency,
      noiseLowpassFrequency: defaultNoiseLowpassFrequency,
      noiseStereoWidth: defaultNoiseStereoWidth,

      setOscillatorFrequency: (index, freq) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            frequency: clamp(freq, 20, 20000, newOscillators[index].frequency),
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorGain: (index, gain) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            gain: clamp(gain, 0, 1, newOscillators[index].gain),
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorWaveform: (index, waveform) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            waveform,
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorPan: (index, pan) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            pan: clamp(pan, -1, 1, newOscillators[index].pan),
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorMuted: (index, muted) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            muted,
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorSoloed: (index, soloed) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            soloed,
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorTremoloEnabled: (index, enabled) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            tremoloEnabled: enabled,
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorTremoloRate: (index, rate) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            tremoloRate: clamp(rate, 0.1, 30, newOscillators[index].tremoloRate),
          };

          return { oscillators: newOscillators };
        }),

      setOscillatorTremoloDepth: (index, depth) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            tremoloDepth: clamp(depth, 0, 1, newOscillators[index].tremoloDepth),
          };

          return { oscillators: newOscillators };
        }),

      setMasterVolume: (volume) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            masterVolume: clamp(volume, 0, 1, state.masterFX.masterVolume),
          },
        })),

      setReverbWet: (wet) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            reverbWet: clamp(wet, 0, 1, state.masterFX.reverbWet),
          },
        })),

      setReverbDecay: (decay) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            reverbDecay: clamp(decay, 0.2, 12, state.masterFX.reverbDecay),
          },
        })),

      setAutoPannerRate: (rate) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            autoPannerRate: clamp(rate, 0, 20, state.masterFX.autoPannerRate),
          },
        })),

      setAutoPannerDepth: (depth) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            autoPannerDepth: clamp(depth, 0, 1, state.masterFX.autoPannerDepth),
          },
        })),

      setBinauralMode: (enabled, presetName = null) =>
        set({
          isBinauralMode: enabled,
          binauralPreset: presetName,
        }),

      setTimerDuration: (duration) => set({ timerDuration: duration }),

      setTimerRemaining: (remaining) => set({ timerRemaining: remaining }),

      setIsRecording: (recording) => set({ isRecording: recording }),

      setNoiseEnabled: (enabled) => set({ noiseEnabled: enabled }),

      setNoiseType: (type) => set({ noiseType: type }),

      setNoiseGain: (gain) =>
        set((state) => ({
          noiseGain: clamp(gain, 0, 1, state.noiseGain),
        })),

      setNoiseHighpassFrequency: (frequency) =>
        set((state) => ({
          noiseHighpassFrequency: clamp(
            frequency,
            20,
            500,
            state.noiseHighpassFrequency
          ),
        })),

      setNoiseLowpassFrequency: (frequency) =>
        set((state) => ({
          noiseLowpassFrequency: clamp(
            frequency,
            500,
            12000,
            state.noiseLowpassFrequency
          ),
        })),

      setNoiseStereoWidth: (width) =>
        set((state) => ({
          noiseStereoWidth: clamp(width, 0, 1, state.noiseStereoWidth),
        })),

      savePreset: (name) => {
        const state = get();

        const newPreset: Preset = {
          id: `preset-${Date.now()}`,
          version: CURRENT_PRESET_VERSION,
          name: normalizePresetName(name),
          description: defaultPresetDescription,
          intendedUse: defaultPresetIntendedUse,
          headphonesRecommended: false,
          caution: defaultPresetCaution,
          tags: ['custom'],
          oscillators: cloneOscillators(state.oscillators),
          masterFX: { ...state.masterFX },
          noiseEnabled: state.noiseEnabled,
          noiseType: state.noiseType,
          noiseGain: state.noiseGain,
          noiseHighpassFrequency: state.noiseHighpassFrequency,
          noiseLowpassFrequency: state.noiseLowpassFrequency,
          noiseStereoWidth: state.noiseStereoWidth,
          createdAt: Date.now(),
        };

        set((currentState) => ({
          presets: [
            ...builtInPresets,
            newPreset,
            ...normalizeUserPresets(currentState.presets),
          ].slice(0, builtInPresets.length + MAX_USER_PRESETS),
        }));
      },

      loadPreset: (id) => {
        const state = get();
        const preset = state.presets.find((item) => item.id === id);

        if (!preset) return;

        set({
          oscillators: normalizeOscillators(preset.oscillators),
          masterFX: normalizeMasterFX(preset.masterFX),
          noiseEnabled: preset.noiseEnabled ?? defaultNoiseEnabled,
          noiseType: isNoiseType(preset.noiseType) ? preset.noiseType : defaultNoiseType,
          noiseGain: clamp(preset.noiseGain, 0, 1, defaultNoiseGain),
          noiseHighpassFrequency: normalizeNoiseHighpassFrequency(preset.noiseHighpassFrequency),
          noiseLowpassFrequency: normalizeNoiseLowpassFrequency(preset.noiseLowpassFrequency),
          noiseStereoWidth: normalizeNoiseStereoWidth(preset.noiseStereoWidth),
          isBinauralMode: false,
          binauralPreset: null,
        });
      },

      deletePreset: (id) =>
        set((state) => ({
          presets: id.startsWith('built-in-')
            ? state.presets
            : state.presets.filter((preset) => preset.id !== id),
        })),

      applySharedPreset: (payload) => {
        set({
          oscillators: normalizeOscillators(payload.oscillators),
          masterFX: normalizeMasterFX(payload.masterFX),
          noiseEnabled:
            typeof payload.noiseEnabled === 'boolean'
              ? payload.noiseEnabled
              : defaultNoiseEnabled,
          noiseType: isNoiseType(payload.noiseType) ? payload.noiseType : defaultNoiseType,
          noiseGain: clamp(payload.noiseGain, 0, 1, defaultNoiseGain),
          noiseHighpassFrequency: normalizeNoiseHighpassFrequency(
            payload.noiseHighpassFrequency
          ),
          noiseLowpassFrequency: normalizeNoiseLowpassFrequency(payload.noiseLowpassFrequency),
          noiseStereoWidth: normalizeNoiseStereoWidth(payload.noiseStereoWidth),
          isBinauralMode:
            typeof payload.isBinauralMode === 'boolean' ? payload.isBinauralMode : false,
          binauralPreset:
            typeof payload.binauralPreset === 'string' ? payload.binauralPreset : null,
        });
      },

      resetToDefaults: () =>
        set({
          oscillators: cloneOscillators(defaultOscillators),
          masterFX: { ...defaultMasterFX },
          isBinauralMode: false,
          binauralPreset: null,
          timerDuration: null,
          timerRemaining: null,
          isRecording: false,
          noiseEnabled: defaultNoiseEnabled,
          noiseType: defaultNoiseType,
          noiseGain: defaultNoiseGain,
          noiseHighpassFrequency: defaultNoiseHighpassFrequency,
          noiseLowpassFrequency: defaultNoiseLowpassFrequency,
          noiseStereoWidth: defaultNoiseStereoWidth,
          presets: mergePresets(get().presets),
        }),
    }),
    {
      name: 'auralis-storage',
      partialize: (state) => ({
        presets: state.presets,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuralisState> | undefined;

        return {
          ...currentState,
          ...persisted,
          presets: mergePresets(persisted?.presets),
        };
      },
    }
  )
);
