import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ModulationMode,
  ModulationTargets,
  NoiseType,
  TextureType,
  WaveformType,
} from '../lib/audioEngine';
import { clampUnknown } from '@/utils/math';

export interface OscillatorState {
  frequency: number;
  detuneCents: number;
  gain: number;
  waveform: WaveformType;
  pan: number;
  phaseDegrees: number;
  muted: boolean;
  soloed: boolean;
  tremoloEnabled: boolean;
  tremoloShape: WaveformType;
  tremoloRate: number;
  tremoloDepth: number;
  attackSeconds: number;
  releaseSeconds: number;
}

export interface MasterFXState {
  masterVolume: number;
  limiterThresholdDb: number;
  reverbWet: number;
  reverbDecay: number;
  reverbPreDelay: number;
  autoPannerRate: number;
  autoPannerDepth: number;
  eqEnabled: boolean;
  eqLowGain: number;
  eqMidGain: number;
  eqHighGain: number;
  stereoWidth: number;
  delayEnabled: boolean;
  delayWet: number;
  delayTime: number;
  delayFeedback: number;
  chorusEnabled: boolean;
  chorusWet: number;
  chorusRate: number;
  chorusDepth: number;
}

export interface ModulationState {
  mode: ModulationMode;
  rate: number;
  depth: number;
  targets: ModulationTargets;
}

export interface TextureLayerState {
  enabled: boolean;
  type: TextureType;
  gain: number;
  tone: number;
  width: number;
  motion: number;
}

export interface CreatorSessionState {
  title: string;
  purpose: string;
  notes: string;
  visualTheme: string;
  storyboardNotes: string;
  durationMinutes: number;
  exportSlug: string;
}

export interface SharedPresetPayload {
  version?: number;
  name?: string;
  description?: string;
  intendedUse?: string;
  headphonesRecommended?: boolean;
  exportReady?: boolean;
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
  modulation?: Partial<ModulationState>;
  textureLayer?: Partial<TextureLayerState>;
  creatorSession?: Partial<CreatorSessionState>;
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
  exportReady: boolean;
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
  modulation: ModulationState;
  textureLayer: TextureLayerState;
  creatorSession: CreatorSessionState;
  createdAt: number;
}

export type ActivePresetSource = 'built-in' | 'user' | 'shared';

export interface ActivePresetIdentity {
  id: string | null;
  name: string | null;
  source: ActivePresetSource | null;
  modified: boolean;
}

interface AuralisState {
  oscillators: OscillatorState[];
  masterFX: MasterFXState;
  isBinauralMode: boolean;
  binauralPreset: string | null;
  presets: Preset[];
  activePresetId: string | null;
  activePresetName: string | null;
  activePresetSource: ActivePresetSource | null;
  isActivePresetModified: boolean;
  timerDuration: number | null;
  timerRemaining: number | null;
  isRecording: boolean;
  noiseEnabled: boolean;
  noiseType: NoiseType;
  noiseGain: number;
  noiseHighpassFrequency: number;
  noiseLowpassFrequency: number;
  noiseStereoWidth: number;
  modulation: ModulationState;
  textureLayer: TextureLayerState;
  creatorSession: CreatorSessionState;

  setOscillatorFrequency: (index: number, freq: number) => void;
  setOscillatorDetune: (index: number, detuneCents: number) => void;
  setOscillatorGain: (index: number, gain: number) => void;
  setOscillatorWaveform: (index: number, waveform: WaveformType) => void;
  setOscillatorPan: (index: number, pan: number) => void;
  setOscillatorPhase: (index: number, phaseDegrees: number) => void;
  setOscillatorMuted: (index: number, muted: boolean) => void;
  setOscillatorSoloed: (index: number, soloed: boolean) => void;
  setOscillatorTremoloEnabled: (index: number, enabled: boolean) => void;
  setOscillatorTremoloShape: (index: number, shape: WaveformType) => void;
  setOscillatorTremoloRate: (index: number, rate: number) => void;
  setOscillatorTremoloDepth: (index: number, depth: number) => void;
  setOscillatorEnvelope: (index: number, attackSeconds: number, releaseSeconds: number) => void;
  setMasterVolume: (volume: number) => void;
  setLimiterThreshold: (thresholdDb: number) => void;
  setReverbWet: (wet: number) => void;
  setReverbDecay: (decay: number) => void;
  setReverbPreDelay: (preDelay: number) => void;
  setAutoPannerRate: (rate: number) => void;
  setAutoPannerDepth: (depth: number) => void;
  setEqEnabled: (enabled: boolean) => void;
  setEqGain: (band: 'low' | 'mid' | 'high', gain: number) => void;
  setStereoWidth: (width: number) => void;
  setDelayEnabled: (enabled: boolean) => void;
  setDelayWet: (wet: number) => void;
  setDelayTime: (time: number) => void;
  setDelayFeedback: (feedback: number) => void;
  setChorusEnabled: (enabled: boolean) => void;
  setChorusWet: (wet: number) => void;
  setChorusRate: (rate: number) => void;
  setChorusDepth: (depth: number) => void;
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
  setModulationMode: (mode: ModulationMode) => void;
  setModulationRate: (rate: number) => void;
  setModulationDepth: (depth: number) => void;
  setModulationTarget: (target: keyof ModulationTargets, enabled: boolean) => void;
  setTextureLayerEnabled: (enabled: boolean) => void;
  setTextureLayerType: (type: TextureType) => void;
  setTextureLayerGain: (gain: number) => void;
  setTextureLayerTone: (tone: number) => void;
  setTextureLayerWidth: (width: number) => void;
  setTextureLayerMotion: (motion: number) => void;
  setCreatorSessionField: (field: keyof CreatorSessionState, value: string | number) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  applySharedPreset: (payload: SharedPresetPayload) => void;
  markActivePresetModified: () => void;
  setActivePresetIdentity: (identity: ActivePresetIdentity) => void;
  resetToDefaults: () => void;
}

export const CURRENT_PRESET_VERSION = 2;
const MAX_USER_PRESETS = 50;
const MAX_PRESET_NAME_LENGTH = 80;
const MAX_PRESET_DESCRIPTION_LENGTH = 180;
const MAX_PRESET_INTENDED_USE_LENGTH = 48;
const MAX_PRESET_CAUTION_LENGTH = 160;
const MAX_PRESET_TAG_LENGTH = 24;
const MAX_PRESET_TAGS = 5;
const MAX_CREATOR_TITLE_LENGTH = 96;
const MAX_CREATOR_PURPOSE_LENGTH = 80;
const MAX_CREATOR_NOTES_LENGTH = 320;
const MAX_CREATOR_VISUAL_THEME_LENGTH = 120;
const MAX_CREATOR_STORYBOARD_NOTES_LENGTH = 420;
const MAX_CREATOR_EXPORT_SLUG_LENGTH = 96;

const clamp = clampUnknown;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isWaveformType = (value: unknown): value is WaveformType => {
  return value === 'sine' || value === 'square' || value === 'sawtooth' || value === 'triangle';
};

const isNoiseType = (value: unknown): value is NoiseType => {
  return value === 'white' || value === 'pink' || value === 'brown';
};

const isModulationMode = (value: unknown): value is ModulationMode => {
  return (
    value === 'off' ||
    value === 'gentle' ||
    value === 'breathing' ||
    value === 'pulse' ||
    value === 'drift'
  );
};

const isTextureType = (value: unknown): value is TextureType => {
  return (
    value === 'rain' ||
    value === 'storm' ||
    value === 'wind' ||
    value === 'ocean' ||
    value === 'drone'
  );
};

const defaultOscillators: OscillatorState[] = [
  {
    frequency: 200,
    detuneCents: 0,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    phaseDegrees: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloShape: 'sine',
    tremoloRate: 2,
    tremoloDepth: 0.3,
    attackSeconds: 0.02,
    releaseSeconds: 0.2,
  },
  {
    frequency: 300,
    detuneCents: 0,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    phaseDegrees: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloShape: 'sine',
    tremoloRate: 2.5,
    tremoloDepth: 0.3,
    attackSeconds: 0.02,
    releaseSeconds: 0.2,
  },
  {
    frequency: 400,
    detuneCents: 0,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    phaseDegrees: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloShape: 'sine',
    tremoloRate: 3,
    tremoloDepth: 0.3,
    attackSeconds: 0.02,
    releaseSeconds: 0.2,
  },
  {
    frequency: 500,
    detuneCents: 0,
    gain: 0.35,
    waveform: 'sine',
    pan: 0,
    phaseDegrees: 0,
    muted: false,
    soloed: false,
    tremoloEnabled: false,
    tremoloShape: 'sine',
    tremoloRate: 3.5,
    tremoloDepth: 0.3,
    attackSeconds: 0.02,
    releaseSeconds: 0.2,
  },
];

const defaultMasterFX: MasterFXState = {
  masterVolume: 0.6,
  limiterThresholdDb: -1,
  reverbWet: 0.3,
  reverbDecay: 6,
  reverbPreDelay: 0.01,
  autoPannerRate: 0.2,
  autoPannerDepth: 0.5,
  eqEnabled: false,
  eqLowGain: 0,
  eqMidGain: 0,
  eqHighGain: 0,
  stereoWidth: 0.5,
  delayEnabled: false,
  delayWet: 0,
  delayTime: 0.25,
  delayFeedback: 0.2,
  chorusEnabled: false,
  chorusWet: 0,
  chorusRate: 0.8,
  chorusDepth: 0.2,
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
const defaultModulation: ModulationState = {
  mode: 'off',
  rate: 0.08,
  depth: 0.25,
  targets: {
    noiseFilter: true,
    noiseWidth: true,
    oscillatorPan: false,
  },
};
const defaultTextureLayer: TextureLayerState = {
  enabled: false,
  type: 'rain',
  gain: 0.12,
  tone: 0.5,
  width: 0.7,
  motion: 0.2,
};
const defaultCreatorSession: CreatorSessionState = {
  title: '',
  purpose: 'Relaxation sound session',
  notes: '',
  visualTheme: 'Dark cyan/violet audio visualizer',
  storyboardNotes: '',
  durationMinutes: 30,
  exportSlug: '',
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
  detuneCents: 0,
  gain,
  waveform,
  pan,
  phaseDegrees: 0,
  muted: false,
  soloed: false,
  tremoloEnabled: false,
  tremoloShape: 'sine',
  tremoloRate: 2,
  tremoloDepth: 0.3,
  attackSeconds: 0.02,
  releaseSeconds: 0.2,
});

const createPresetMetadata = (
  description: string,
  intendedUse: string,
  tags: string[],
  headphonesRecommended: boolean = false,
  caution: string = defaultPresetCaution,
  exportReady: boolean = true
) => ({
  description,
  intendedUse,
  headphonesRecommended,
  exportReady,
  caution,
  tags,
});

const cloneModulation = (modulation: ModulationState = defaultModulation): ModulationState => ({
  ...modulation,
  targets: { ...modulation.targets },
});

const cloneTextureLayer = (
  textureLayer: TextureLayerState = defaultTextureLayer
): TextureLayerState => ({
  ...textureLayer,
});

const cloneCreatorSession = (
  creatorSession: CreatorSessionState = defaultCreatorSession
): CreatorSessionState => ({
  ...creatorSession,
});

const createPresetExtension = (
  title: string,
  options: {
    modulation?: ModulationState;
    textureLayer?: TextureLayerState;
    creatorSession?: Partial<CreatorSessionState>;
  } = {}
) => ({
  modulation: cloneModulation(options.modulation),
  textureLayer: cloneTextureLayer(options.textureLayer),
  creatorSession: {
    ...cloneCreatorSession(defaultCreatorSession),
    ...options.creatorSession,
    title,
  },
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Gamma Neural Binding (40Hz)'),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Alpha Relaxed Focus (10Hz)'),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Theta Meditation Gate (6Hz)'),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Delta Sleep Descent (2Hz)'),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Soft Evening Unwind (4Hz)', {
      modulation: {
        mode: 'breathing',
        rate: 0.05,
        depth: 0.18,
        targets: { noiseFilter: true, noiseWidth: true, oscillatorPan: false },
      },
      textureLayer: {
        enabled: true,
        type: 'ocean',
        gain: 0.07,
        tone: 0.35,
        width: 0.55,
        motion: 0.35,
      },
    }),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Calm Breathing Bed (6Hz)', {
      modulation: {
        mode: 'breathing',
        rate: 0.07,
        depth: 0.16,
        targets: { noiseFilter: true, noiseWidth: true, oscillatorPan: false },
      },
      textureLayer: {
        enabled: true,
        type: 'wind',
        gain: 0.06,
        tone: 0.45,
        width: 0.6,
        motion: 0.28,
      },
    }),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Alpha Lantern (10Hz)'),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Deep Drone Horizon', {
      modulation: {
        mode: 'drift',
        rate: 0.04,
        depth: 0.2,
        targets: { noiseFilter: true, noiseWidth: true, oscillatorPan: true },
      },
      textureLayer: {
        enabled: true,
        type: 'drone',
        gain: 0.1,
        tone: 0.3,
        width: 0.5,
        motion: 0.18,
      },
    }),
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
      ...defaultMasterFX,
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
    ...createPresetExtension('Soft Noise Cocoon', {
      modulation: {
        mode: 'gentle',
        rate: 0.06,
        depth: 0.22,
        targets: { noiseFilter: true, noiseWidth: true, oscillatorPan: false },
      },
      textureLayer: {
        enabled: true,
        type: 'rain',
        gain: 0.08,
        tone: 0.42,
        width: 0.75,
        motion: 0.25,
      },
    }),
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
      detuneCents: clamp(incoming.detuneCents, -1200, 1200, defaultOscillator.detuneCents),
      gain: clamp(incoming.gain, 0, 1, defaultOscillator.gain),
      waveform: isWaveformType(incoming.waveform) ? incoming.waveform : defaultOscillator.waveform,
      pan: clamp(incoming.pan, -1, 1, defaultOscillator.pan),
      phaseDegrees: clamp(incoming.phaseDegrees, 0, 360, defaultOscillator.phaseDegrees),
      muted: typeof incoming.muted === 'boolean' ? incoming.muted : defaultOscillator.muted,
      soloed: typeof incoming.soloed === 'boolean' ? incoming.soloed : defaultOscillator.soloed,
      tremoloEnabled:
        typeof incoming.tremoloEnabled === 'boolean'
          ? incoming.tremoloEnabled
          : defaultOscillator.tremoloEnabled,
      tremoloShape: isWaveformType(incoming.tremoloShape)
        ? incoming.tremoloShape
        : defaultOscillator.tremoloShape,
      tremoloRate: clamp(incoming.tremoloRate, 0.1, 30, defaultOscillator.tremoloRate),
      tremoloDepth: clamp(incoming.tremoloDepth, 0, 1, defaultOscillator.tremoloDepth),
      attackSeconds: clamp(incoming.attackSeconds, 0.001, 5, defaultOscillator.attackSeconds),
      releaseSeconds: clamp(
        incoming.releaseSeconds,
        0.01,
        10,
        defaultOscillator.releaseSeconds
      ),
    };
  });
};

export const normalizeMasterFX = (incomingMasterFX?: Partial<MasterFXState>): MasterFXState => {
  return {
    masterVolume: clamp(incomingMasterFX?.masterVolume, 0, 1, defaultMasterFX.masterVolume),
    limiterThresholdDb: clamp(
      incomingMasterFX?.limiterThresholdDb,
      -12,
      -0.1,
      defaultMasterFX.limiterThresholdDb
    ),
    reverbWet: clamp(incomingMasterFX?.reverbWet, 0, 1, defaultMasterFX.reverbWet),
    reverbDecay: clamp(incomingMasterFX?.reverbDecay, 0.2, 12, defaultMasterFX.reverbDecay),
    reverbPreDelay: clamp(
      incomingMasterFX?.reverbPreDelay,
      0,
      0.5,
      defaultMasterFX.reverbPreDelay
    ),
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
    eqEnabled:
      typeof incomingMasterFX?.eqEnabled === 'boolean'
        ? incomingMasterFX.eqEnabled
        : defaultMasterFX.eqEnabled,
    eqLowGain: clamp(incomingMasterFX?.eqLowGain, -12, 12, defaultMasterFX.eqLowGain),
    eqMidGain: clamp(incomingMasterFX?.eqMidGain, -12, 12, defaultMasterFX.eqMidGain),
    eqHighGain: clamp(incomingMasterFX?.eqHighGain, -12, 12, defaultMasterFX.eqHighGain),
    stereoWidth: clamp(incomingMasterFX?.stereoWidth, 0, 1, defaultMasterFX.stereoWidth),
    delayEnabled:
      typeof incomingMasterFX?.delayEnabled === 'boolean'
        ? incomingMasterFX.delayEnabled
        : defaultMasterFX.delayEnabled,
    delayWet: clamp(incomingMasterFX?.delayWet, 0, 1, defaultMasterFX.delayWet),
    delayTime: clamp(incomingMasterFX?.delayTime, 0.01, 1, defaultMasterFX.delayTime),
    delayFeedback: clamp(incomingMasterFX?.delayFeedback, 0, 0.9, defaultMasterFX.delayFeedback),
    chorusEnabled:
      typeof incomingMasterFX?.chorusEnabled === 'boolean'
        ? incomingMasterFX.chorusEnabled
        : defaultMasterFX.chorusEnabled,
    chorusWet: clamp(incomingMasterFX?.chorusWet, 0, 1, defaultMasterFX.chorusWet),
    chorusRate: clamp(incomingMasterFX?.chorusRate, 0.05, 8, defaultMasterFX.chorusRate),
    chorusDepth: clamp(incomingMasterFX?.chorusDepth, 0, 1, defaultMasterFX.chorusDepth),
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

export const normalizeModulation = (
  incomingModulation?: Partial<ModulationState>
): ModulationState => {
  const incomingTargets = incomingModulation?.targets;

  return {
    mode: isModulationMode(incomingModulation?.mode)
      ? incomingModulation.mode
      : defaultModulation.mode,
    rate: clamp(incomingModulation?.rate, 0.01, 1, defaultModulation.rate),
    depth: clamp(incomingModulation?.depth, 0, 1, defaultModulation.depth),
    targets: {
      noiseFilter:
        typeof incomingTargets?.noiseFilter === 'boolean'
          ? incomingTargets.noiseFilter
          : defaultModulation.targets.noiseFilter,
      noiseWidth:
        typeof incomingTargets?.noiseWidth === 'boolean'
          ? incomingTargets.noiseWidth
          : defaultModulation.targets.noiseWidth,
      oscillatorPan:
        typeof incomingTargets?.oscillatorPan === 'boolean'
          ? incomingTargets.oscillatorPan
          : defaultModulation.targets.oscillatorPan,
    },
  };
};

export const normalizeTextureLayer = (
  incomingTextureLayer?: Partial<TextureLayerState>
): TextureLayerState => {
  return {
    enabled:
      typeof incomingTextureLayer?.enabled === 'boolean'
        ? incomingTextureLayer.enabled
        : defaultTextureLayer.enabled,
    type: isTextureType(incomingTextureLayer?.type)
      ? incomingTextureLayer.type
      : defaultTextureLayer.type,
    gain: clamp(incomingTextureLayer?.gain, 0, 1, defaultTextureLayer.gain),
    tone: clamp(incomingTextureLayer?.tone, 0, 1, defaultTextureLayer.tone),
    width: clamp(incomingTextureLayer?.width, 0, 1, defaultTextureLayer.width),
    motion: clamp(incomingTextureLayer?.motion, 0, 1, defaultTextureLayer.motion),
  };
};

export const normalizeCreatorSession = (
  incomingCreatorSession?: Partial<CreatorSessionState>
): CreatorSessionState => {
  return {
    title: normalizeLimitedText(
      incomingCreatorSession?.title,
      defaultCreatorSession.title,
      MAX_CREATOR_TITLE_LENGTH
    ),
    purpose: normalizeLimitedText(
      incomingCreatorSession?.purpose,
      defaultCreatorSession.purpose,
      MAX_CREATOR_PURPOSE_LENGTH
    ),
    notes: normalizeLimitedText(
      incomingCreatorSession?.notes,
      defaultCreatorSession.notes,
      MAX_CREATOR_NOTES_LENGTH
    ),
    visualTheme: normalizeLimitedText(
      incomingCreatorSession?.visualTheme,
      defaultCreatorSession.visualTheme,
      MAX_CREATOR_VISUAL_THEME_LENGTH
    ),
    storyboardNotes: normalizeLimitedText(
      incomingCreatorSession?.storyboardNotes,
      defaultCreatorSession.storyboardNotes,
      MAX_CREATOR_STORYBOARD_NOTES_LENGTH
    ),
    durationMinutes: clamp(
      incomingCreatorSession?.durationMinutes,
      1,
      720,
      defaultCreatorSession.durationMinutes
    ),
    exportSlug: normalizeLimitedText(
      incomingCreatorSession?.exportSlug,
      defaultCreatorSession.exportSlug,
      MAX_CREATOR_EXPORT_SLUG_LENGTH
    ),
  };
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
    exportReady: typeof preset.exportReady === 'boolean' ? preset.exportReady : false,
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
    modulation: normalizeModulation(preset.modulation),
    textureLayer: normalizeTextureLayer(preset.textureLayer),
    creatorSession: normalizeCreatorSession(preset.creatorSession),
    createdAt: clamp(preset.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
};

const normalizeUserPresets = (presets: Preset[]): Preset[] => {
  return presets
    .filter((preset) => !preset.id.startsWith('built-in-'))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_USER_PRESETS);
};

interface PersistedAuralisState {
  presets: Preset[];
}

const readCompatiblePersistedPresets = (persistedState: unknown): Preset[] => {
  if (!isPlainObject(persistedState) || !Array.isArray(persistedState.presets)) return [];

  const compatiblePresets: Preset[] = [];
  const seenIds = new Set<string>();

  persistedState.presets.forEach((candidate) => {
    if (!isPlainObject(candidate)) return;

    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const version = candidate.version;
    const hasCompatibleVersion =
      version === undefined || version === 1 || version === CURRENT_PRESET_VERSION;
    const hasCompatibleCoreShape =
      typeof candidate.name === 'string' &&
      candidate.name.trim().length > 0 &&
      Array.isArray(candidate.oscillators) &&
      candidate.oscillators.length > 0 &&
      candidate.oscillators.length <= 4 &&
      candidate.oscillators.every(isPlainObject) &&
      isPlainObject(candidate.masterFX) &&
      typeof candidate.createdAt === 'number' &&
      Number.isFinite(candidate.createdAt);

    if (
      !id ||
      id.length > 128 ||
      id.startsWith('built-in-') ||
      seenIds.has(id) ||
      !hasCompatibleVersion ||
      !hasCompatibleCoreShape
    ) {
      return;
    }

    seenIds.add(id);
    compatiblePresets.push(normalizePreset({ ...candidate, id }));
  });

  return normalizeUserPresets(compatiblePresets);
};

export const migratePersistedAuralisState = (
  persistedState: unknown,
  envelopeVersion: number
): PersistedAuralisState => {
  if (!Number.isInteger(envelopeVersion) || envelopeVersion < 0 || envelopeVersion > 1) {
    return { presets: [] };
  }

  return { presets: readCompatiblePersistedPresets(persistedState) };
};

export const mergePersistedAuralisState = (
  persistedState: unknown,
  currentState: AuralisState
): AuralisState => {
  const persisted = migratePersistedAuralisState(persistedState, 1);

  return {
    ...currentState,
    presets: mergePresets(persisted.presets),
  };
};

export const useAuralisStore = create<AuralisState>()(
  persist(
    (set, get) => ({
      oscillators: cloneOscillators(defaultOscillators),
      masterFX: { ...defaultMasterFX },
      isBinauralMode: false,
      binauralPreset: null,
      presets: mergePresets(),
      activePresetId: null,
      activePresetName: null,
      activePresetSource: null,
      isActivePresetModified: false,
      timerDuration: null,
      timerRemaining: null,
      isRecording: false,
      noiseEnabled: defaultNoiseEnabled,
      noiseType: defaultNoiseType,
      noiseGain: defaultNoiseGain,
      noiseHighpassFrequency: defaultNoiseHighpassFrequency,
      noiseLowpassFrequency: defaultNoiseLowpassFrequency,
      noiseStereoWidth: defaultNoiseStereoWidth,
      modulation: cloneModulation(defaultModulation),
      textureLayer: cloneTextureLayer(defaultTextureLayer),
      creatorSession: cloneCreatorSession(defaultCreatorSession),

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

      setOscillatorDetune: (index, detuneCents) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            detuneCents: clamp(detuneCents, -1200, 1200, newOscillators[index].detuneCents),
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

      setOscillatorPhase: (index, phaseDegrees) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            phaseDegrees: clamp(phaseDegrees, 0, 360, newOscillators[index].phaseDegrees),
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

      setOscillatorTremoloShape: (index, shape) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            tremoloShape: isWaveformType(shape) ? shape : newOscillators[index].tremoloShape,
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

      setOscillatorEnvelope: (index, attackSeconds, releaseSeconds) =>
        set((state) => {
          const newOscillators = cloneOscillators(state.oscillators);
          if (!newOscillators[index]) return state;

          newOscillators[index] = {
            ...newOscillators[index],
            attackSeconds: clamp(attackSeconds, 0.001, 5, newOscillators[index].attackSeconds),
            releaseSeconds: clamp(releaseSeconds, 0.01, 10, newOscillators[index].releaseSeconds),
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

      setLimiterThreshold: (thresholdDb) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            limiterThresholdDb: clamp(
              thresholdDb,
              -12,
              -0.1,
              state.masterFX.limiterThresholdDb
            ),
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

      setReverbPreDelay: (preDelay) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            reverbPreDelay: clamp(preDelay, 0, 0.5, state.masterFX.reverbPreDelay),
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

      setEqEnabled: (enabled) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            eqEnabled: enabled,
          },
        })),

      setEqGain: (band, gain) =>
        set((state) => {
          const key =
            band === 'low' ? 'eqLowGain' : band === 'mid' ? 'eqMidGain' : 'eqHighGain';

          return {
            masterFX: {
              ...state.masterFX,
              [key]: clamp(gain, -12, 12, state.masterFX[key]),
            },
          };
        }),

      setStereoWidth: (width) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            stereoWidth: clamp(width, 0, 1, state.masterFX.stereoWidth),
          },
        })),

      setDelayEnabled: (enabled) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            delayEnabled: enabled,
          },
        })),

      setDelayWet: (wet) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            delayWet: clamp(wet, 0, 1, state.masterFX.delayWet),
          },
        })),

      setDelayTime: (time) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            delayTime: clamp(time, 0.01, 1, state.masterFX.delayTime),
          },
        })),

      setDelayFeedback: (feedback) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            delayFeedback: clamp(feedback, 0, 0.9, state.masterFX.delayFeedback),
          },
        })),

      setChorusEnabled: (enabled) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            chorusEnabled: enabled,
          },
        })),

      setChorusWet: (wet) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            chorusWet: clamp(wet, 0, 1, state.masterFX.chorusWet),
          },
        })),

      setChorusRate: (rate) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            chorusRate: clamp(rate, 0.05, 8, state.masterFX.chorusRate),
          },
        })),

      setChorusDepth: (depth) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            chorusDepth: clamp(depth, 0, 1, state.masterFX.chorusDepth),
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

      setModulationMode: (mode) =>
        set((state) => ({
          modulation: {
            ...state.modulation,
            mode: isModulationMode(mode) ? mode : state.modulation.mode,
          },
        })),

      setModulationRate: (rate) =>
        set((state) => ({
          modulation: {
            ...state.modulation,
            rate: clamp(rate, 0.01, 1, state.modulation.rate),
          },
        })),

      setModulationDepth: (depth) =>
        set((state) => ({
          modulation: {
            ...state.modulation,
            depth: clamp(depth, 0, 1, state.modulation.depth),
          },
        })),

      setModulationTarget: (target, enabled) =>
        set((state) => ({
          modulation: {
            ...state.modulation,
            targets: {
              ...state.modulation.targets,
              [target]: enabled,
            },
          },
        })),

      setTextureLayerEnabled: (enabled) =>
        set((state) => ({
          textureLayer: {
            ...state.textureLayer,
            enabled,
          },
        })),

      setTextureLayerType: (type) =>
        set((state) => ({
          textureLayer: {
            ...state.textureLayer,
            type: isTextureType(type) ? type : state.textureLayer.type,
          },
        })),

      setTextureLayerGain: (gain) =>
        set((state) => ({
          textureLayer: {
            ...state.textureLayer,
            gain: clamp(gain, 0, 1, state.textureLayer.gain),
          },
        })),

      setTextureLayerTone: (tone) =>
        set((state) => ({
          textureLayer: {
            ...state.textureLayer,
            tone: clamp(tone, 0, 1, state.textureLayer.tone),
          },
        })),

      setTextureLayerWidth: (width) =>
        set((state) => ({
          textureLayer: {
            ...state.textureLayer,
            width: clamp(width, 0, 1, state.textureLayer.width),
          },
        })),

      setTextureLayerMotion: (motion) =>
        set((state) => ({
          textureLayer: {
            ...state.textureLayer,
            motion: clamp(motion, 0, 1, state.textureLayer.motion),
          },
        })),

      setCreatorSessionField: (field, value) =>
        set((state) => ({
          creatorSession: normalizeCreatorSession({
            ...state.creatorSession,
            [field]: value,
          }),
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
          exportReady: true,
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
          modulation: cloneModulation(state.modulation),
          textureLayer: cloneTextureLayer(state.textureLayer),
          creatorSession: normalizeCreatorSession({
            ...state.creatorSession,
            title: state.creatorSession.title || normalizePresetName(name),
          }),
          createdAt: Date.now(),
        };

        set((currentState) => ({
          presets: [
            ...builtInPresets,
            newPreset,
            ...normalizeUserPresets(currentState.presets),
          ].slice(0, builtInPresets.length + MAX_USER_PRESETS),
          activePresetId: newPreset.id,
          activePresetName: newPreset.name,
          activePresetSource: 'user',
          isActivePresetModified: false,
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
          modulation: normalizeModulation(preset.modulation),
          textureLayer: normalizeTextureLayer(preset.textureLayer),
          creatorSession: normalizeCreatorSession(preset.creatorSession),
          isBinauralMode: false,
          binauralPreset: null,
          activePresetId: preset.id,
          activePresetName: preset.name,
          activePresetSource: preset.id.startsWith('built-in-') ? 'built-in' : 'user',
          isActivePresetModified: false,
        });
      },

      deletePreset: (id) =>
        set((state) => {
          if (id.startsWith('built-in-')) return state;

          const deletingActivePreset = state.activePresetId === id;

          return {
            presets: state.presets.filter((preset) => preset.id !== id),
            ...(deletingActivePreset
              ? {
                  activePresetId: null,
                  activePresetName: null,
                  activePresetSource: null,
                  isActivePresetModified: false,
                }
              : {}),
          };
        }),

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
          modulation: normalizeModulation(payload.modulation),
          textureLayer: normalizeTextureLayer(payload.textureLayer),
          creatorSession: normalizeCreatorSession(payload.creatorSession),
          isBinauralMode: false,
          binauralPreset: null,
          activePresetId: null,
          activePresetName:
            typeof payload.name === 'string' && payload.name.trim()
              ? payload.name.trim().slice(0, MAX_PRESET_NAME_LENGTH)
              : 'Shared Preset',
          activePresetSource: 'shared',
          isActivePresetModified: false,
        });
      },

      markActivePresetModified: () =>
        set((state) => ({
          isActivePresetModified: state.activePresetName
            ? true
            : state.isActivePresetModified,
        })),

      setActivePresetIdentity: (identity) =>
        set({
          activePresetId: identity.id,
          activePresetName: identity.name,
          activePresetSource: identity.source,
          isActivePresetModified: identity.modified,
        }),

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
          modulation: cloneModulation(defaultModulation),
          textureLayer: cloneTextureLayer(defaultTextureLayer),
          creatorSession: cloneCreatorSession(defaultCreatorSession),
          presets: mergePresets(get().presets),
          activePresetId: null,
          activePresetName: null,
          activePresetSource: null,
          isActivePresetModified: false,
        }),
    }),
    {
      name: 'auralis-storage',
      version: 1,
      migrate: migratePersistedAuralisState,
      partialize: (state) => ({
        presets: normalizeUserPresets(state.presets),
      }),
      merge: mergePersistedAuralisState,
    }
  )
);
