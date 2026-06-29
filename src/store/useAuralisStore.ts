import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoiseType, WaveformType } from '../lib/audioEngine';

export interface OscillatorState {
  frequency: number;
  gain: number;
  waveform: WaveformType;
  pan: number;
  tremoloEnabled: boolean;
  tremoloRate: number;
  tremoloDepth: number;
}

export interface MasterFXState {
  reverbWet: number;
  autoPannerRate: number;
  autoPannerDepth: number;
}

export interface SharedPresetPayload {
  version?: number;
  name?: string;
  oscillators?: Partial<OscillatorState>[];
  masterFX?: Partial<MasterFXState>;
  noiseEnabled?: boolean;
  noiseType?: NoiseType;
  noiseGain?: number;
  isBinauralMode?: boolean;
  binauralPreset?: string | null;
  createdAt?: number;
}

export interface Preset {
  id: string;
  name: string;
  oscillators: OscillatorState[];
  masterFX: MasterFXState;
  noiseEnabled: boolean;
  noiseType: NoiseType;
  noiseGain: number;
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

  setOscillatorFrequency: (index: number, freq: number) => void;
  setOscillatorGain: (index: number, gain: number) => void;
  setOscillatorWaveform: (index: number, waveform: WaveformType) => void;
  setOscillatorPan: (index: number, pan: number) => void;
  setOscillatorTremoloEnabled: (index: number, enabled: boolean) => void;
  setOscillatorTremoloRate: (index: number, rate: number) => void;
  setOscillatorTremoloDepth: (index: number, depth: number) => void;
  setReverbWet: (wet: number) => void;
  setAutoPannerRate: (rate: number) => void;
  setAutoPannerDepth: (depth: number) => void;
  setBinauralMode: (enabled: boolean, presetName?: string | null) => void;
  setTimerDuration: (duration: number | null) => void;
  setTimerRemaining: (remaining: number | null) => void;
  setIsRecording: (recording: boolean) => void;
  setNoiseEnabled: (enabled: boolean) => void;
  setNoiseType: (type: NoiseType) => void;
  setNoiseGain: (gain: number) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  applySharedPreset: (payload: SharedPresetPayload) => void;
  resetToDefaults: () => void;
}

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};

const isWaveformType = (value: unknown): value is WaveformType => {
  return value === 'sine' || value === 'square' || value === 'sawtooth' || value === 'triangle';
};

const isNoiseType = (value: unknown): value is NoiseType => {
  return value === 'white' || value === 'pink' || value === 'brown';
};

const defaultOscillators: OscillatorState[] = [
  {
    frequency: 200,
    gain: 0.5,
    waveform: 'sine',
    pan: 0,
    tremoloEnabled: false,
    tremoloRate: 2,
    tremoloDepth: 0.3,
  },
  {
    frequency: 300,
    gain: 0.5,
    waveform: 'sine',
    pan: 0,
    tremoloEnabled: false,
    tremoloRate: 2.5,
    tremoloDepth: 0.3,
  },
  {
    frequency: 400,
    gain: 0.5,
    waveform: 'sine',
    pan: 0,
    tremoloEnabled: false,
    tremoloRate: 3,
    tremoloDepth: 0.3,
  },
  {
    frequency: 500,
    gain: 0.5,
    waveform: 'sine',
    pan: 0,
    tremoloEnabled: false,
    tremoloRate: 3.5,
    tremoloDepth: 0.3,
  },
];

const defaultMasterFX: MasterFXState = {
  reverbWet: 0.3,
  autoPannerRate: 0.2,
  autoPannerDepth: 0.5,
};

const defaultNoiseEnabled = false;
const defaultNoiseType: NoiseType = 'brown';
const defaultNoiseGain = 0.2;
const builtInPresetCreatedAt = Date.UTC(2026, 5, 29, 12);

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
  tremoloEnabled: false,
  tremoloRate: 2,
  tremoloDepth: 0.3,
});

const builtInPresets: Preset[] = [
  {
    id: 'built-in-gamma-neural-binding-40hz',
    name: 'Gamma Neural Binding (40Hz)',
    oscillators: [
      createOscillator(200, 0.6, -1),
      createOscillator(240, 0.6, 1),
      createOscillator(400, 0, 0),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      reverbWet: 0.1,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.1,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-alpha-relaxed-focus-10hz',
    name: 'Alpha Relaxed Focus (10Hz)',
    oscillators: [
      createOscillator(220, 0.48, -1),
      createOscillator(230, 0.48, 1),
      createOscillator(440, 0.08, 0, 'triangle'),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      reverbWet: 0.12,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.08,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-theta-meditation-6hz',
    name: 'Theta Meditation Gate (6Hz)',
    oscillators: [
      createOscillator(180, 0.45, -1),
      createOscillator(186, 0.45, 1),
      createOscillator(360, 0.06, 0),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      reverbWet: 0.16,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'pink',
    noiseGain: 0.12,
    createdAt: builtInPresetCreatedAt,
  },
  {
    id: 'built-in-delta-sleep-descent-2hz',
    name: 'Delta Sleep Descent (2Hz)',
    oscillators: [
      createOscillator(120, 0.38, -1),
      createOscillator(122, 0.38, 1),
      createOscillator(240, 0.05, 0),
      createOscillator(500, 0, 0),
    ],
    masterFX: {
      reverbWet: 0.18,
      autoPannerRate: 0,
      autoPannerDepth: 0,
    },
    noiseEnabled: true,
    noiseType: 'brown',
    noiseGain: 0.15,
    createdAt: builtInPresetCreatedAt,
  },
];

const mergePresets = (incomingPresets: Preset[] = []): Preset[] => {
  const mergedPresets = [...builtInPresets];
  const existingIds = new Set(mergedPresets.map((preset) => preset.id));

  incomingPresets.forEach((preset) => {
    if (!existingIds.has(preset.id)) {
      mergedPresets.push(preset);
      existingIds.add(preset.id);
    }
  });

  return mergedPresets;
};

const normalizeOscillators = (
  incomingOscillators?: Partial<OscillatorState>[]
): OscillatorState[] => {
  return defaultOscillators.map((defaultOscillator, index) => {
    const incoming = incomingOscillators?.[index] ?? {};

    return {
      frequency: clamp(incoming.frequency, 20, 20000, defaultOscillator.frequency),
      gain: clamp(incoming.gain, 0, 1, defaultOscillator.gain),
      waveform: isWaveformType(incoming.waveform) ? incoming.waveform : defaultOscillator.waveform,
      pan: clamp(incoming.pan, -1, 1, defaultOscillator.pan),
      tremoloEnabled:
        typeof incoming.tremoloEnabled === 'boolean'
          ? incoming.tremoloEnabled
          : defaultOscillator.tremoloEnabled,
      tremoloRate: clamp(incoming.tremoloRate, 0.1, 30, defaultOscillator.tremoloRate),
      tremoloDepth: clamp(incoming.tremoloDepth, 0, 1, defaultOscillator.tremoloDepth),
    };
  });
};

const normalizeMasterFX = (incomingMasterFX?: Partial<MasterFXState>): MasterFXState => {
  return {
    reverbWet: clamp(incomingMasterFX?.reverbWet, 0, 1, defaultMasterFX.reverbWet),
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

      setReverbWet: (wet) =>
        set((state) => ({
          masterFX: {
            ...state.masterFX,
            reverbWet: clamp(wet, 0, 1, state.masterFX.reverbWet),
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

      savePreset: (name) => {
        const state = get();

        const newPreset: Preset = {
          id: `preset-${Date.now()}`,
          name,
          oscillators: cloneOscillators(state.oscillators),
          masterFX: { ...state.masterFX },
          noiseEnabled: state.noiseEnabled,
          noiseType: state.noiseType,
          noiseGain: state.noiseGain,
          createdAt: Date.now(),
        };

        set((currentState) => ({
          presets: [...currentState.presets, newPreset],
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
          isBinauralMode: false,
          binauralPreset: null,
        });
      },

      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
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
