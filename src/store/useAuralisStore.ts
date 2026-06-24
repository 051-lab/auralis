import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WaveformType } from '../lib/audioEngine';

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

export interface Preset {
  id: string;
  name: string;
  oscillators: OscillatorState[];
  masterFX: MasterFXState;
  createdAt: number;
}

interface AuralisState {
  oscillators: OscillatorState[];
  masterFX: MasterFXState;
  isBinauralMode: boolean;
  binauralPreset: string | null;
  presets: Preset[];
  
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
  setBinauralMode: (enabled: boolean, presetName?: string) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetToDefaults: () => void;
}

const defaultOscillators: OscillatorState[] = [
  { frequency: 200, gain: 0.5, waveform: 'sine', pan: 0, tremoloEnabled: false, tremoloRate: 2, tremoloDepth: 0.3 },
  { frequency: 300, gain: 0.5, waveform: 'sine', pan: 0, tremoloEnabled: false, tremoloRate: 2.5, tremoloDepth: 0.3 },
  { frequency: 400, gain: 0.5, waveform: 'sine', pan: 0, tremoloEnabled: false, tremoloRate: 3, tremoloDepth: 0.3 },
  { frequency: 500, gain: 0.5, waveform: 'sine', pan: 0, tremoloEnabled: false, tremoloRate: 3.5, tremoloDepth: 0.3 },
];

const defaultMasterFX: MasterFXState = {
  reverbWet: 0.3,
  autoPannerRate: 0.2,
  autoPannerDepth: 0.5,
};

export const useAuralisStore = create<AuralisState>()(
  persist(
    (set, get) => ({
      oscillators: defaultOscillators,
      masterFX: defaultMasterFX,
      isBinauralMode: false,
      binauralPreset: null,
      presets: [],

      setOscillatorFrequency: (index, freq) =>
        set((state) => {
          const newOscillators = [...state.oscillators];
          newOscillators[index] = { ...newOscillators[index], frequency: freq };
          return { oscillators: newOscillators };
        }),

      setOscillatorGain: (index, gain) =>
        set((state) => {
          const newOscillators = [...state.oscillators];
          newOscillators[index] = { ...newOscillators[index], gain };
          return { oscillators: newOscillators };
        }),

      setOscillatorWaveform: (index, waveform) =>
        set((state) => {
          const newOscillators = [...state.oscillators];
          newOscillators[index] = { ...newOscillators[index], waveform };
          return { oscillators: newOscillators };
        }),

      setOscillatorPan: (index, pan) =>
        set((state) => {
          const newOscillators = [...state.oscillators];
          newOscillators[index] = { ...newOscillators[index], pan };
          return { oscillators: newOscillators };
        }),

      setOscillatorTremoloEnabled: (index, enabled) =>
        set((state) => {
          const newOscillators = [...state.oscillators];
          newOscillators[index] = { ...newOscillators[index], tremoloEnabled: enabled };
          return { oscillators: newOscillators };
        }),

      setOscillatorTremoloRate: (index, rate) =>
        set((state) => {
          const newOscillators = [...state.oscillators];
          newOscillators[index] = { ...newOscillators[index], tremoloRate: rate };
          return { oscillators: newOscillators };
        }),

      setOscillatorTremoloDepth: (index, depth) =>
        set((state) => {
          const newOscillators = [...state.oscillators];
          newOscillators[index] = { ...newOscillators[index], tremoloDepth: depth };
          return { oscillators: newOscillators };
        }),

      setReverbWet: (wet) => set((state) => ({ masterFX: { ...state.masterFX, reverbWet: wet } })),
      setAutoPannerRate: (rate) => set((state) => ({ masterFX: { ...state.masterFX, autoPannerRate: rate } })),
      setAutoPannerDepth: (depth) => set((state) => ({ masterFX: { ...state.masterFX, autoPannerDepth: depth } })),
      setBinauralMode: (enabled, presetName = null) => set({ isBinauralMode: enabled, binauralPreset: presetName }),

      savePreset: (name) => {
        const state = get();
        const newPreset: Preset = {
          id: `preset-${Date.now()}`,
          name,
          oscillators: [...state.oscillators],
          masterFX: { ...state.masterFX },
          createdAt: Date.now(),
        };
        set((s) => ({ presets: [...s.presets, newPreset] }));
      },

      loadPreset: (id) => {
        const state = get();
        const preset = state.presets.find((p) => p.id === id);
        if (preset) {
          set({
            oscillators: [...preset.oscillators],
            masterFX: { ...preset.masterFX },
            isBinauralMode: false,
            binauralPreset: null,
          });
        }
      },

      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),

      resetToDefaults: () => set({
        oscillators: defaultOscillators,
        masterFX: defaultMasterFX,
        isBinauralMode: false,
        binauralPreset: null,
      }),
    }),
    {
      name: 'auralis-storage',
      partialize: (state) => ({ presets: state.presets }),
    }
  )
);
