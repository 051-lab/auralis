'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AudioWaveform,
  Boxes,
  CloudRain,
  Circle,
  Copy,
  Disc3,
  Download,
  Gauge,
  Headphones,
  Library,
  Maximize2,
  Moon,
  Play,
  Radio,
  Save,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Volume2,
  Waves,
} from 'lucide-react';
import { getAudioEngine } from '@/lib/audioEngine';
import type {
  ModulationMode,
  NoiseType,
  RecordingMode,
  TextureType,
  WaveformType,
} from '@/lib/audioEngine';
import {
  CURRENT_PRESET_VERSION,
  getEffectiveOscillatorGain,
  useAuralisStore,
} from '@/store/useAuralisStore';
import type {
  ActivePresetIdentity,
  CreatorSessionState,
  MasterFXState,
  ModulationState,
  OscillatorState,
  SharedPresetPayload,
  TextureLayerState,
} from '@/store/useAuralisStore';
import { OscillatorPanel } from '@/components/OscillatorPanel';
import { OutputMeter } from '@/components/OutputMeter';
import { Visualizer } from '@/components/Visualizer';
import { Timer } from '@/components/Timer';
import { formatFrequency, linearToLogFrequency } from '@/utils/audioMath';
import {
  MAX_BINAURAL_BEAT_FREQUENCY,
  MAX_BINAURAL_CARRIER_FREQUENCY,
  MIN_BINAURAL_BEAT_FREQUENCY,
  createBinauralPair,
  getBinauralGuidance,
  normalizeBinauralBaseFrequency,
  normalizeBinauralBeatFrequency,
} from '@/utils/binaural';
import { clamp } from '@/utils/math';
import { decodeSharedPreset, encodeSharedPreset } from '@/utils/sharePreset';
import {
  createExportBlob,
  getRecordingExtension,
  getRecordingModeDescription,
  getRecordingModeLabel,
} from '@/utils/recordingExport';
import type { ExportFormat, ExportSampleRate } from '@/utils/recordingExport';
import { buildCreatorExportDraft } from '@/utils/creatorExport';
import {
  PRESET_CATEGORY_OPTIONS,
  countPresetsByCategory,
  filterPresets,
} from '@/utils/presetFilters';
import type { PresetCategory } from '@/utils/presetFilters';
import { getPlaybackStatus, isAudiblePlayback } from '@/utils/playbackState';
import { analytics } from '@/lib/analytics';
import { useAnalytics } from '@/lib/useAnalytics';
import packageJson from '../../package.json';
import {
  Card,
  ControlSlider,
  GlassPanel,
  PresetArtwork,
  SectionHeader,
  StatusPill,
  ToggleSwitch,
} from '@/components/ui';

type AudioEngineInstance = ReturnType<typeof getAudioEngine>;

const numberInputClass =
  'w-24 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-right text-xs text-slate-100 outline-none transition-colors focus:border-cyan-500';

const BINAURAL_PRESETS = [
  { name: 'Delta Sleep', freq: 2 },
  { name: 'Theta Meditation', freq: 6 },
  { name: 'Alpha Focus', freq: 10 },
  { name: 'Beta Alertness', freq: 20 },
  { name: 'Gamma Insight', freq: 40 },
];

const NOISE_TYPES: NoiseType[] = ['brown', 'pink', 'white'];
const MODULATION_MODES: Array<{ value: ModulationMode; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'breathing', label: 'Breathing' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'drift', label: 'Drift' },
];
const TEXTURE_TYPES: Array<{ value: TextureType; label: string }> = [
  { value: 'rain', label: 'Rain' },
  { value: 'storm', label: 'Storm' },
  { value: 'wind', label: 'Wind' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'drone', label: 'Drone' },
];
const MAX_SHARE_URL_LENGTH = 2000;
const BINAURAL_TONE_CLASSES = {
  cyan: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
};
const BINAURAL_ACKNOWLEDGEMENT_STORAGE_KEY = 'auralis-binaural-safety-acknowledged';

type PendingBinauralActivation = {
  baseFrequency: number;
  beatFrequency: number;
  label?: string;
};

type BinauralSessionSnapshot = {
  oscillators: OscillatorState[];
  masterFX: MasterFXState;
  noiseEnabled: boolean;
  modulation: ModulationState;
  textureLayer: TextureLayerState;
  activePresetIdentity: ActivePresetIdentity;
};

type FrequencyLinkMode = 'free' | 'harmonic';

type RecordingStopReason = 'manual' | 'playback_stop' | 'timer_complete';

type FrozenRecordingConfig = {
  mode: RecordingMode;
  format: ExportFormat;
  sampleRate: ExportSampleRate;
  startedAt: number;
};

type PendingExport = {
  id: string;
  recording: Blob;
  config: FrozenRecordingConfig;
  stoppedAt: number;
  reason: Exclude<RecordingStopReason, 'manual'>;
};

function formatTime(totalSeconds: number | null | undefined): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function clampNumber(value: number, min: number, max: number): number {
  return clamp(value, min, max);
}

function percentInputValue(value: number): number {
  return Number((value * 100).toFixed(0));
}

function numberInputValue(value: number): number {
  return Number(value.toFixed(0));
}

function formatFilterFrequency(value: number): string {
  return formatFrequency(value).replace('.00 ', ' ');
}

function formatBinauralNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export default function Home() {
  const [engine, setEngine] = useState<AudioEngineInstance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('wet');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webm');
  const [exportSampleRate, setExportSampleRate] = useState<ExportSampleRate>('48');
  const [binauralBaseFrequency, setBinauralBaseFrequency] = useState(400);
  const [customBinauralBeatFrequency, setCustomBinauralBeatFrequency] = useState(6);
  const [hasAcknowledgedBinauralSafety, setHasAcknowledgedBinauralSafety] = useState(false);
  const [pendingBinauralActivation, setPendingBinauralActivation] =
    useState<PendingBinauralActivation | null>(null);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategory, setPresetCategory] = useState<PresetCategory>('all');
  const [frequencyLinkMode, setFrequencyLinkMode] = useState<FrequencyLinkMode>('free');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [lastExportName, setLastExportName] = useState<string | null>(null);
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const recordingConfigRef = useRef<FrozenRecordingConfig | null>(null);
  const recordingFinalizationRef = useRef<Promise<void> | null>(null);
  const binauralSnapshotRef = useRef<BinauralSessionSnapshot | null>(null);
  const previousSyncRef = useRef<{
    oscillators: OscillatorState[];
    masterFX: MasterFXState;
    noiseType: NoiseType;
    noiseGain: number;
    noiseEnabled: boolean;
    noiseHighpassFrequency: number;
    noiseLowpassFrequency: number;
    noiseStereoWidth: number;
    modulation: ModulationState;
    textureLayer: TextureLayerState;
    isBinauralMode: boolean;
    isAudible: boolean;
  } | null>(null);

  useAnalytics();

  const {
    oscillators,
    masterFX,
    isBinauralMode,
    binauralPreset,
    presets,
    activePresetId,
    activePresetName,
    activePresetSource,
    isActivePresetModified,
    timerDuration,
    timerRemaining,
    isRecording,
    noiseEnabled,
    noiseType,
    noiseGain,
    noiseHighpassFrequency,
    noiseLowpassFrequency,
    noiseStereoWidth,
    modulation,
    textureLayer,
    creatorSession,
    setOscillatorFrequency,
    setOscillatorDetune,
    setOscillatorGain,
    setOscillatorWaveform,
    setOscillatorPan,
    setOscillatorPhase,
    setOscillatorMuted,
    setOscillatorSoloed,
    setOscillatorTremoloEnabled,
    setOscillatorTremoloShape,
    setOscillatorTremoloRate,
    setOscillatorTremoloDepth,
    setOscillatorEnvelope,
    setMasterVolume,
    setLimiterThreshold,
    setReverbWet,
    setReverbDecay,
    setReverbPreDelay,
    setAutoPannerRate,
    setAutoPannerDepth,
    setEqEnabled,
    setEqGain,
    setStereoWidth,
    setDelayEnabled,
    setDelayWet,
    setDelayTime,
    setDelayFeedback,
    setChorusEnabled,
    setChorusWet,
    setChorusRate,
    setChorusDepth,
    setBinauralMode,
    savePreset,
    loadPreset,
    deletePreset,
    setTimerDuration,
    setTimerRemaining,
    setIsRecording,
    setNoiseEnabled,
    setNoiseType,
    setNoiseGain,
    setNoiseHighpassFrequency,
    setNoiseLowpassFrequency,
    setNoiseStereoWidth,
    setModulationMode,
    setModulationRate,
    setModulationDepth,
    setModulationTarget,
    setTextureLayerEnabled,
    setTextureLayerType,
    setTextureLayerGain,
    setTextureLayerTone,
    setTextureLayerWidth,
    setTextureLayerMotion,
    setCreatorSessionField,
    applySharedPreset,
    markActivePresetModified,
    setActivePresetIdentity,
  } = useAuralisStore();

  const isAudible = isAudiblePlayback(isPlaying, isFadingOut);

  useEffect(() => {
    setEngine(getAudioEngine());
  }, []);

  useEffect(() => {
    try {
      setHasAcknowledgedBinauralSafety(
        window.localStorage.getItem(BINAURAL_ACKNOWLEDGEMENT_STORAGE_KEY) === 'true'
      );
    } catch {
      setHasAcknowledgedBinauralSafety(false);
    }
  }, []);

  const ensureEngine = (): AudioEngineInstance => {
    const activeEngine = engine ?? getAudioEngine();

    if (!engine) {
      setEngine(activeEngine);
    }

    return activeEngine;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get('preset');

    if (!presetParam) return;

    try {
      const decodedPreset = decodeSharedPreset(presetParam);

      applySharedPreset(decodedPreset);
      analytics.trackPresetLoad(decodedPreset.name ?? 'Shared Preset', 'url');
      setShareMessage('Shared preset loaded from URL.');
    } catch (err) {
      console.warn('Failed to load shared preset from URL:', err);
      setShareMessage('Could not load shared preset from URL.');
    }
  }, [applySharedPreset]);

  useEffect(() => {
    if (!engine) return;

    const previous = previousSyncRef.current;
    const hasSoloedOscillator = oscillators.some((oscillator) => oscillator.soloed);
    const previousHasSoloedOscillator =
      previous?.oscillators.some((oscillator) => oscillator.soloed) ?? false;

    oscillators.forEach((oscillator, index) => {
      const previousOscillator = previous?.oscillators[index];
      const effectiveGain = getEffectiveOscillatorGain(oscillator, hasSoloedOscillator);
      const previousEffectiveGain = previousOscillator
        ? getEffectiveOscillatorGain(previousOscillator, previousHasSoloedOscillator)
        : undefined;

      if (!previousOscillator || previousOscillator.frequency !== oscillator.frequency) {
        engine.setFrequency(index, oscillator.frequency);
      }

      if (!previousOscillator || previousOscillator.detuneCents !== oscillator.detuneCents) {
        engine.setDetune(index, oscillator.detuneCents);
      }

      if (!previousOscillator || previousEffectiveGain !== effectiveGain) {
        engine.setGain(index, effectiveGain);
      }

      if (!previousOscillator || previousOscillator.waveform !== oscillator.waveform) {
        engine.setWaveform(index, oscillator.waveform);
      }

      if (!previousOscillator || previousOscillator.pan !== oscillator.pan) {
        engine.setPan(index, oscillator.pan);
      }

      if (!previousOscillator || previousOscillator.phaseDegrees !== oscillator.phaseDegrees) {
        engine.setPhase(index, oscillator.phaseDegrees);
      }

      if (
        !previousOscillator ||
        previousOscillator.attackSeconds !== oscillator.attackSeconds ||
        previousOscillator.releaseSeconds !== oscillator.releaseSeconds
      ) {
        engine.setEnvelope(index, oscillator.attackSeconds, oscillator.releaseSeconds);
      }

      if (!previousOscillator || previousOscillator.tremoloShape !== oscillator.tremoloShape) {
        engine.setTremoloShape(index, oscillator.tremoloShape);
      }

      if (!previousOscillator || previousOscillator.tremoloRate !== oscillator.tremoloRate) {
        engine.setTremoloRate(index, oscillator.tremoloRate);
      }

      if (!previousOscillator || previousOscillator.tremoloDepth !== oscillator.tremoloDepth) {
        engine.setTremoloDepth(index, oscillator.tremoloDepth);
      }

      if (!previousOscillator || previousOscillator.tremoloEnabled !== oscillator.tremoloEnabled) {
        engine.setTremoloEnabled(index, oscillator.tremoloEnabled);
      }
    });

    if (!previous || previous.masterFX.masterVolume !== masterFX.masterVolume) {
      engine.setMasterVolume(masterFX.masterVolume);
    }

    if (!previous || previous.masterFX.limiterThresholdDb !== masterFX.limiterThresholdDb) {
      engine.setLimiterThreshold(masterFX.limiterThresholdDb);
    }

    if (!previous || previous.masterFX.reverbWet !== masterFX.reverbWet) {
      engine.setReverbWet(masterFX.reverbWet);
    }

    if (!previous || previous.masterFX.reverbDecay !== masterFX.reverbDecay) {
      engine.setReverbDecay(masterFX.reverbDecay);
    }

    if (!previous || previous.masterFX.reverbPreDelay !== masterFX.reverbPreDelay) {
      engine.setReverbPreDelay(masterFX.reverbPreDelay);
    }

    if (!previous || previous.masterFX.autoPannerRate !== masterFX.autoPannerRate) {
      engine.setAutoPannerRate(masterFX.autoPannerRate);
    }

    if (!previous || previous.masterFX.autoPannerDepth !== masterFX.autoPannerDepth) {
      engine.setAutoPannerDepth(masterFX.autoPannerDepth);
    }

    const didEqChange =
      !previous ||
      previous.masterFX.eqEnabled !== masterFX.eqEnabled ||
      previous.masterFX.eqLowGain !== masterFX.eqLowGain ||
      previous.masterFX.eqMidGain !== masterFX.eqMidGain ||
      previous.masterFX.eqHighGain !== masterFX.eqHighGain;

    if (didEqChange) {
      engine.setEq(
        masterFX.eqEnabled,
        masterFX.eqLowGain,
        masterFX.eqMidGain,
        masterFX.eqHighGain
      );
    }

    if (!previous || previous.masterFX.stereoWidth !== masterFX.stereoWidth) {
      engine.setMasterStereoWidth(masterFX.stereoWidth);
    }

    const didDelayChange =
      !previous ||
      previous.masterFX.delayEnabled !== masterFX.delayEnabled ||
      previous.masterFX.delayWet !== masterFX.delayWet ||
      previous.masterFX.delayTime !== masterFX.delayTime ||
      previous.masterFX.delayFeedback !== masterFX.delayFeedback;

    if (didDelayChange) {
      engine.setDelay(
        masterFX.delayEnabled,
        masterFX.delayWet,
        masterFX.delayTime,
        masterFX.delayFeedback
      );
    }

    const didChorusChange =
      !previous ||
      previous.masterFX.chorusEnabled !== masterFX.chorusEnabled ||
      previous.masterFX.chorusWet !== masterFX.chorusWet ||
      previous.masterFX.chorusRate !== masterFX.chorusRate ||
      previous.masterFX.chorusDepth !== masterFX.chorusDepth;

    if (didChorusChange) {
      engine.setChorus(
        masterFX.chorusEnabled,
        masterFX.chorusWet,
        masterFX.chorusRate,
        masterFX.chorusDepth
      );
    }

    if (!previous || previous.noiseType !== noiseType) {
      engine.setNoiseType(noiseType);
    }

    if (!previous || previous.noiseGain !== noiseGain) {
      engine.setNoiseGain(noiseGain);
    }

    if (!previous || previous.noiseHighpassFrequency !== noiseHighpassFrequency) {
      engine.setNoiseHighpassFrequency(noiseHighpassFrequency);
    }

    if (!previous || previous.noiseLowpassFrequency !== noiseLowpassFrequency) {
      engine.setNoiseLowpassFrequency(noiseLowpassFrequency);
    }

    if (!previous || previous.noiseStereoWidth !== noiseStereoWidth) {
      engine.setNoiseStereoWidth(noiseStereoWidth);
    }

    if (isAudible && noiseEnabled && noiseGain > 0) {
      engine.startNoise();
    } else {
      engine.stopNoise();
    }

    const didModulationChange =
      !previous ||
      previous.modulation.mode !== modulation.mode ||
      previous.modulation.rate !== modulation.rate ||
      previous.modulation.depth !== modulation.depth ||
      previous.modulation.targets.noiseFilter !== modulation.targets.noiseFilter ||
      previous.modulation.targets.noiseWidth !== modulation.targets.noiseWidth ||
      previous.modulation.targets.oscillatorPan !== modulation.targets.oscillatorPan ||
      previous.isAudible !== isAudible ||
      previous.isBinauralMode !== isBinauralMode;

    if (didModulationChange) {
      engine.setModulation({
        ...modulation,
        targets: { ...modulation.targets },
        allowOscillatorPan: !isBinauralMode,
      });
    }

    const didTextureLayerChange =
      !previous ||
      previous.textureLayer.enabled !== textureLayer.enabled ||
      previous.textureLayer.type !== textureLayer.type ||
      previous.textureLayer.gain !== textureLayer.gain ||
      previous.textureLayer.tone !== textureLayer.tone ||
      previous.textureLayer.width !== textureLayer.width ||
      previous.textureLayer.motion !== textureLayer.motion ||
      previous.isAudible !== isAudible;

    if (didTextureLayerChange) {
      engine.setTextureLayer(textureLayer);
    }

    previousSyncRef.current = {
      oscillators: oscillators.map((oscillator) => ({ ...oscillator })),
      masterFX: { ...masterFX },
      noiseType,
      noiseGain,
      noiseEnabled,
      noiseHighpassFrequency,
      noiseLowpassFrequency,
      noiseStereoWidth,
      modulation: {
        ...modulation,
        targets: { ...modulation.targets },
      },
      textureLayer: { ...textureLayer },
      isBinauralMode,
      isAudible,
    };
  }, [
    engine,
    oscillators,
    masterFX,
    noiseEnabled,
    noiseType,
    noiseGain,
    noiseHighpassFrequency,
    noiseLowpassFrequency,
    noiseStereoWidth,
    modulation,
    textureLayer,
    isBinauralMode,
    isAudible,
  ]);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (isAudible && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        } catch (err) {
          console.warn('Wake Lock error:', err);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAudible && 'wakeLock' in navigator) {
        await requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLockRef.current?.release();
    };
  }, [isAudible]);

  useEffect(() => {
    if (!isRecording && !pendingExport) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRecording, pendingExport]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;

      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        if (isPlaying) {
          handleStop();
        } else {
          handleStart();
        }
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (isRecording) {
          handleStopRecording();
        } else if (isPlaying) {
          handleStartRecording();
        }
      }

      if (event.key === 'Escape' && isBinauralMode) {
        event.preventDefault();
        exitBinaural();
      }

      if (event.key.toLowerCase() === 's' && presetName.trim()) {
        event.preventDefault();
        handleSavePreset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  const handleStart = async () => {
    const activeEngine = ensureEngine();

    setIsFadingOut(false);
    await activeEngine.start();

    if (noiseEnabled && noiseGain > 0) {
      activeEngine.startNoise();
    }

    setIsPlaying(true);
    analytics.trackAudioStart();
  };

  const handleStop = async () => {
    const activeEngine = ensureEngine();

    setIsPlaying(false);
    setIsFadingOut(true);

    if (timerRemaining !== null && timerRemaining > 0) {
      setTimerDuration(null);
      setTimerRemaining(null);
    }

    const didCompleteFade = await activeEngine.fadeOutAndStop(2);

    if (didCompleteFade) {
      if (activeEngine.isCurrentlyRecording()) {
        await finalizeRecording('playback_stop', false);
      }
      setIsFadingOut(false);
      analytics.trackAudioStop('manual');
    } else if (!activeEngine.isRunning()) {
      setIsFadingOut(false);
    }
  };

  const handleTimerComplete = async () => {
    const activeEngine = ensureEngine();

    setIsPlaying(false);
    setIsFadingOut(true);
    setTimerDuration(null);
    setTimerRemaining(null);

    const didCompleteFade = await activeEngine.fadeOutAndStop(10);

    if (didCompleteFade) {
      if (activeEngine.isCurrentlyRecording()) {
        await finalizeRecording('timer_complete', false);
      }
      setIsFadingOut(false);
      analytics.trackAudioStop('timer_complete');
      setStatusMessage('Session timer complete. Audio faded out smoothly.');
    } else if (!activeEngine.isRunning()) {
      setIsFadingOut(false);
    }
  };

  const handleFrequencyChange = (index: number, linearValue: number) => {
    const freq = linearToLogFrequency(linearValue, 20, 20000);
    setOscillatorFrequency(index, freq);

    if (frequencyLinkMode === 'harmonic' && index === 0) {
      [2, 3, 4].forEach((ratio, ratioIndex) => {
        setOscillatorFrequency(ratioIndex + 1, clampNumber(freq * ratio, 20, 20000));
      });
    }

    markActivePresetModified();
  };

  const handleFrequencyLinkModeChange = (mode: FrequencyLinkMode) => {
    setFrequencyLinkMode(mode);

    if (mode === 'harmonic') {
      const baseFrequency = oscillators[0]?.frequency ?? 200;

      [2, 3, 4].forEach((ratio, ratioIndex) => {
        setOscillatorFrequency(ratioIndex + 1, clampNumber(baseFrequency * ratio, 20, 20000));
      });
      markActivePresetModified();
    }
  };

  const handleDetuneChange = (index: number, detuneCents: number) => {
    setOscillatorDetune(index, detuneCents);
    markActivePresetModified();
  };

  const handleGainChange = (index: number, gain: number) => {
    setOscillatorGain(index, gain);
    markActivePresetModified();
  };

  const handleWaveformChange = (index: number, waveform: WaveformType) => {
    setOscillatorWaveform(index, waveform);
    markActivePresetModified();
  };

  const handlePanChange = (index: number, pan: number) => {
    setOscillatorPan(index, pan);
    markActivePresetModified();
  };

  const handlePhaseChange = (index: number, phaseDegrees: number) => {
    setOscillatorPhase(index, phaseDegrees);
    markActivePresetModified();
  };

  const handleMuteToggle = (index: number, muted: boolean) => {
    setOscillatorMuted(index, muted);
    markActivePresetModified();
  };

  const handleSoloToggle = (index: number, soloed: boolean) => {
    setOscillatorSoloed(index, soloed);
    markActivePresetModified();
  };

  const handleTremoloToggle = (index: number, enabled: boolean) => {
    setOscillatorTremoloEnabled(index, enabled);
    markActivePresetModified();
  };

  const handleTremoloShapeChange = (index: number, shape: WaveformType) => {
    setOscillatorTremoloShape(index, shape);
    markActivePresetModified();
  };

  const handleTremoloRateChange = (index: number, rate: number) => {
    setOscillatorTremoloRate(index, rate);
    markActivePresetModified();
  };

  const handleTremoloDepthChange = (index: number, depth: number) => {
    setOscillatorTremoloDepth(index, depth);
    markActivePresetModified();
  };

  const handleEnvelopeChange = (
    index: number,
    attackSeconds: number,
    releaseSeconds: number
  ) => {
    setOscillatorEnvelope(index, attackSeconds, releaseSeconds);
    markActivePresetModified();
  };

  const handleMasterVolumeChange = (volume: number) => {
    setMasterVolume(volume);
    markActivePresetModified();
  };

  const handleLimiterThresholdChange = (thresholdDb: number) => {
    setLimiterThreshold(thresholdDb);
    markActivePresetModified();
  };

  const handleReverbChange = (wet: number) => {
    setReverbWet(wet);
    markActivePresetModified();
  };

  const handleReverbDecayChange = (decay: number) => {
    setReverbDecay(decay);
    markActivePresetModified();
  };

  const handleReverbPreDelayChange = (preDelay: number) => {
    setReverbPreDelay(preDelay);
    markActivePresetModified();
  };

  const handleAutoPannerRateChange = (rate: number) => {
    setAutoPannerRate(rate);
    markActivePresetModified();
  };

  const handleAutoPannerDepthChange = (depth: number) => {
    setAutoPannerDepth(depth);
    markActivePresetModified();
  };

  const handleEqEnabledChange = (enabled: boolean) => {
    setEqEnabled(enabled);
    markActivePresetModified();
  };

  const handleEqGainChange = (band: 'low' | 'mid' | 'high', gain: number) => {
    setEqGain(band, gain);
    markActivePresetModified();
  };

  const handleStereoWidthChange = (width: number) => {
    setStereoWidth(width);
    markActivePresetModified();
  };

  const handleDelayEnabledChange = (enabled: boolean) => {
    setDelayEnabled(enabled);
    markActivePresetModified();
  };

  const handleDelayWetChange = (wet: number) => {
    setDelayWet(wet);
    markActivePresetModified();
  };

  const handleDelayTimeChange = (time: number) => {
    setDelayTime(time);
    markActivePresetModified();
  };

  const handleDelayFeedbackChange = (feedback: number) => {
    setDelayFeedback(feedback);
    markActivePresetModified();
  };

  const handleChorusEnabledChange = (enabled: boolean) => {
    setChorusEnabled(enabled);
    markActivePresetModified();
  };

  const handleChorusWetChange = (wet: number) => {
    setChorusWet(wet);
    markActivePresetModified();
  };

  const handleChorusRateChange = (rate: number) => {
    setChorusRate(rate);
    markActivePresetModified();
  };

  const handleChorusDepthChange = (depth: number) => {
    setChorusDepth(depth);
    markActivePresetModified();
  };

  const handleNoiseToggle = (enabled: boolean) => {
    const activeEngine = ensureEngine();

    setNoiseEnabled(enabled);
    markActivePresetModified();

    if (enabled && isPlaying && noiseGain > 0) {
      activeEngine.startNoise();
    } else {
      activeEngine.stopNoise();
    }
  };

  const handleNoiseTypeChange = (type: NoiseType) => {
    setNoiseType(type);
    markActivePresetModified();
  };

  const handleNoiseGainChange = (gain: number) => {
    setNoiseGain(gain);
    markActivePresetModified();
  };

  const handleNoiseHighpassChange = (frequency: number) => {
    setNoiseHighpassFrequency(frequency);
    markActivePresetModified();
  };

  const handleNoiseLowpassChange = (frequency: number) => {
    setNoiseLowpassFrequency(frequency);
    markActivePresetModified();
  };

  const handleNoiseStereoWidthChange = (width: number) => {
    setNoiseStereoWidth(width);
    markActivePresetModified();
  };

  const handleModulationModeChange = (mode: ModulationMode) => {
    setModulationMode(mode);
    markActivePresetModified();
  };

  const handleModulationRateChange = (rate: number) => {
    setModulationRate(rate);
    markActivePresetModified();
  };

  const handleModulationDepthChange = (depth: number) => {
    setModulationDepth(depth);
    markActivePresetModified();
  };

  const handleModulationTargetChange = (
    target: keyof ModulationState['targets'],
    enabled: boolean
  ) => {
    setModulationTarget(target, enabled);
    markActivePresetModified();
  };

  const handleTextureToggle = (enabled: boolean) => {
    setTextureLayerEnabled(enabled);
    markActivePresetModified();
  };

  const handleTextureTypeChange = (type: TextureType) => {
    setTextureLayerType(type);
    markActivePresetModified();
  };

  const handleTextureGainChange = (gain: number) => {
    setTextureLayerGain(gain);
    markActivePresetModified();
  };

  const handleTextureToneChange = (tone: number) => {
    setTextureLayerTone(tone);
    markActivePresetModified();
  };

  const handleTextureWidthChange = (width: number) => {
    setTextureLayerWidth(width);
    markActivePresetModified();
  };

  const handleTextureMotionChange = (motion: number) => {
    setTextureLayerMotion(motion);
    markActivePresetModified();
  };

  const handleCreatorFieldChange = (
    field: keyof CreatorSessionState,
    value: string | number
  ) => {
    setCreatorSessionField(field, value);
    markActivePresetModified();
  };

  const handlePercentInputChange = (
    value: string,
    onChange: (nextValue: number) => void
  ) => {
    const parsedValue = parseFloat(value);
    if (Number.isNaN(parsedValue)) return;

    onChange(clampNumber(parsedValue, 0, 100) / 100);
  };

  const startBinaural = (baseFreq: number, beatFreq: number, label?: string) => {
    const pair = createBinauralPair(baseFreq, beatFreq);
    const binauralSessionName =
      label ?? BINAURAL_PRESETS.find((preset) => preset.freq === pair.beatFrequency)?.name ?? 'Custom';
    const adjustmentNote =
      pair.baseAdjusted || pair.beatAdjusted
        ? ` Adjusted to ${formatBinauralNumber(pair.baseFrequency)} Hz + ${formatBinauralNumber(pair.beatFrequency)} Hz to stay in range.`
        : '';

    binauralSnapshotRef.current = {
      oscillators: oscillators.map((oscillator) => ({ ...oscillator })),
      masterFX: { ...masterFX },
      noiseEnabled,
      modulation: {
        ...modulation,
        targets: { ...modulation.targets },
      },
      textureLayer: { ...textureLayer },
      activePresetIdentity: {
        id: activePresetId,
        name: activePresetName,
        source: activePresetSource,
        modified: isActivePresetModified,
      },
    };
    markActivePresetModified();
    setBinauralMode(
      true,
      `${formatBinauralNumber(pair.baseFrequency)}Hz + ${formatBinauralNumber(pair.beatFrequency)}Hz`
    );

    oscillators.forEach((_, index) => {
      setOscillatorMuted(index, false);
      setOscillatorSoloed(index, false);
    });

    setReverbWet(0);
    setAutoPannerDepth(0);
    setEqEnabled(false);
    setStereoWidth(0.5);
    setDelayEnabled(false);
    setChorusEnabled(false);
    setNoiseEnabled(false);
    setModulationMode('off');
    setTextureLayerEnabled(false);

    setOscillatorFrequency(0, pair.baseFrequency);
    setOscillatorDetune(0, 0);
    setOscillatorWaveform(0, 'sine');
    setOscillatorPan(0, -1);
    setOscillatorPhase(0, 0);
    setOscillatorGain(0, 0.5);
    setOscillatorTremoloEnabled(0, false);

    setOscillatorFrequency(1, pair.upperFrequency);
    setOscillatorDetune(1, 0);
    setOscillatorWaveform(1, 'sine');
    setOscillatorPan(1, 1);
    setOscillatorPhase(1, 0);
    setOscillatorGain(1, 0.5);
    setOscillatorTremoloEnabled(1, false);

    setOscillatorGain(2, 0);
    setOscillatorTremoloEnabled(2, false);
    setOscillatorGain(3, 0);
    setOscillatorTremoloEnabled(3, false);

    analytics.trackBinauralActivate(binauralSessionName, pair.beatFrequency);
    setStatusMessage(
      `Binaural mode activated: ${binauralSessionName} (${pair.guidance.label}).${adjustmentNote} ${pair.guidance.caution} Strict carrier lock bypasses effects, movement, noise, and textures until exit.`
    );
  };

  const activateBinaural = (baseFreq: number, beatFreq: number, label?: string) => {
    if (!hasAcknowledgedBinauralSafety) {
      setPendingBinauralActivation({ baseFrequency: baseFreq, beatFrequency: beatFreq, label });
      setStatusMessage('Confirm stereo headphones and low volume before starting binaural mode.');
      return;
    }

    startBinaural(baseFreq, beatFreq, label);
  };

  const confirmBinauralSafety = () => {
    setHasAcknowledgedBinauralSafety(true);

    try {
      window.localStorage.setItem(BINAURAL_ACKNOWLEDGEMENT_STORAGE_KEY, 'true');
    } catch {
      // Local storage is optional; the confirmation still applies for this session.
    }

    if (pendingBinauralActivation) {
      startBinaural(
        pendingBinauralActivation.baseFrequency,
        pendingBinauralActivation.beatFrequency,
        pendingBinauralActivation.label
      );
      setPendingBinauralActivation(null);
    }
  };

  const cancelBinauralSafety = () => {
    setPendingBinauralActivation(null);
    setStatusMessage('Binaural activation cancelled.');
  };

  const exitBinaural = () => {
    const snapshot = binauralSnapshotRef.current;

    if (snapshot) {
      snapshot.oscillators.forEach((oscillator, index) => {
        setOscillatorFrequency(index, oscillator.frequency);
        setOscillatorDetune(index, oscillator.detuneCents);
        setOscillatorGain(index, oscillator.gain);
        setOscillatorWaveform(index, oscillator.waveform);
        setOscillatorPan(index, oscillator.pan);
        setOscillatorPhase(index, oscillator.phaseDegrees);
        setOscillatorMuted(index, oscillator.muted);
        setOscillatorSoloed(index, oscillator.soloed);
        setOscillatorTremoloEnabled(index, oscillator.tremoloEnabled);
        setOscillatorTremoloShape(index, oscillator.tremoloShape);
        setOscillatorTremoloRate(index, oscillator.tremoloRate);
        setOscillatorTremoloDepth(index, oscillator.tremoloDepth);
        setOscillatorEnvelope(index, oscillator.attackSeconds, oscillator.releaseSeconds);
      });

      setMasterVolume(snapshot.masterFX.masterVolume);
      setLimiterThreshold(snapshot.masterFX.limiterThresholdDb);
      setReverbWet(snapshot.masterFX.reverbWet);
      setReverbDecay(snapshot.masterFX.reverbDecay);
      setReverbPreDelay(snapshot.masterFX.reverbPreDelay);
      setAutoPannerRate(snapshot.masterFX.autoPannerRate);
      setAutoPannerDepth(snapshot.masterFX.autoPannerDepth);
      setEqGain('low', snapshot.masterFX.eqLowGain);
      setEqGain('mid', snapshot.masterFX.eqMidGain);
      setEqGain('high', snapshot.masterFX.eqHighGain);
      setEqEnabled(snapshot.masterFX.eqEnabled);
      setStereoWidth(snapshot.masterFX.stereoWidth);
      setDelayWet(snapshot.masterFX.delayWet);
      setDelayTime(snapshot.masterFX.delayTime);
      setDelayFeedback(snapshot.masterFX.delayFeedback);
      setDelayEnabled(snapshot.masterFX.delayEnabled);
      setChorusWet(snapshot.masterFX.chorusWet);
      setChorusRate(snapshot.masterFX.chorusRate);
      setChorusDepth(snapshot.masterFX.chorusDepth);
      setChorusEnabled(snapshot.masterFX.chorusEnabled);
      setNoiseEnabled(snapshot.noiseEnabled);
      setModulationRate(snapshot.modulation.rate);
      setModulationDepth(snapshot.modulation.depth);
      Object.entries(snapshot.modulation.targets).forEach(([target, enabled]) => {
        setModulationTarget(target as keyof ModulationState['targets'], enabled);
      });
      setModulationMode(snapshot.modulation.mode);
      setTextureLayerType(snapshot.textureLayer.type);
      setTextureLayerGain(snapshot.textureLayer.gain);
      setTextureLayerTone(snapshot.textureLayer.tone);
      setTextureLayerWidth(snapshot.textureLayer.width);
      setTextureLayerMotion(snapshot.textureLayer.motion);
      setTextureLayerEnabled(snapshot.textureLayer.enabled);
      setActivePresetIdentity(snapshot.activePresetIdentity);
      binauralSnapshotRef.current = null;
    }

    setStatusMessage('Restored oscillator and master effect settings from before binaural mode.');

    setBinauralMode(false);
  };

  const handleSavePreset = () => {
    const trimmedName = presetName.trim();

    if (!trimmedName) return;

    savePreset(trimmedName);
    analytics.trackPresetSave(trimmedName);
    setPresetName('');
    setShareMessage(`Saved preset: ${trimmedName}`);
  };

  const handleLoadPreset = (id: string, name: string) => {
    binauralSnapshotRef.current = null;
    setPendingBinauralActivation(null);
    setBinauralMode(false);
    loadPreset(id);
    analytics.trackPresetLoad(name, 'local');
    setShareMessage(`Loaded preset: ${name}`);
  };

  const handleSharePreset = async () => {
    try {
      const sharedPreset: SharedPresetPayload = {
        version: CURRENT_PRESET_VERSION,
        name: presetName.trim() || 'Auralis Shared Preset',
        description: 'Shared Auralis sound session generated from the current controls.',
        intendedUse: 'Shared session',
        headphonesRecommended: isBinauralMode,
        exportReady: true,
        caution: 'Start at low volume and stop if the sound feels uncomfortable.',
        tags: isBinauralMode ? ['shared', 'binaural'] : ['shared'],
        oscillators,
        masterFX,
        noiseEnabled,
        noiseType,
        noiseGain,
        noiseHighpassFrequency,
        noiseLowpassFrequency,
        noiseStereoWidth,
        modulation,
        textureLayer,
        creatorSession,
        isBinauralMode,
        binauralPreset,
        createdAt: Date.now(),
      };

      const encodedPreset = encodeURIComponent(encodeSharedPreset(sharedPreset));

      const shareUrl = `${window.location.origin}${window.location.pathname}?preset=${encodedPreset}`;

      if (shareUrl.length > MAX_SHARE_URL_LENGTH) {
        setShareMessage('Preset is too large to share as a URL.');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('Share link copied to clipboard.');
      } else {
        window.prompt('Copy this Auralis preset link:', shareUrl);
        setShareMessage('Share link generated.');
      }
    } catch (err) {
      console.error('Failed to create share link:', err);
      setShareMessage('Failed to create share link.');
    }
  };

  const handleStartRecording = async () => {
    if (!isPlaying || pendingExport || isFinalizingRecording) return;

    try {
      const activeEngine = ensureEngine();
      const config: FrozenRecordingConfig = {
        mode: recordingMode,
        format: exportFormat,
        sampleRate: exportSampleRate,
        startedAt: Date.now(),
      };

      recordingConfigRef.current = config;
      await activeEngine.startRecording(config.mode);
      setIsRecording(true);
      setStatusMessage(`Recording started: ${getRecordingModeLabel(config.mode)}.`);
    } catch (err) {
      recordingConfigRef.current = null;
      console.error('Recording start error:', err);
      setStatusMessage('Recording could not start.');
    }
  };

  const downloadRecording = async (
    recording: Blob,
    config: FrozenRecordingConfig
  ): Promise<string> => {
      const exportBlob = await createExportBlob(recording, config.format, config.sampleRate);
      const url = URL.createObjectURL(exportBlob);
      const anchor = document.createElement('a');
      const extension = getRecordingExtension(exportBlob.type);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `auralis-${timestamp}-${config.mode}.${extension}`;

      anchor.href = url;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);

      analytics.trackExport();
      setLastExportName(filename);

      return filename;
  };

  const finalizeRecording = async (
    reason: RecordingStopReason,
    downloadImmediately: boolean
  ): Promise<void> => {
    if (recordingFinalizationRef.current) {
      return recordingFinalizationRef.current;
    }

    const finalization = (async () => {
      const activeEngine = ensureEngine();
      if (!activeEngine.isCurrentlyRecording()) {
        setIsRecording(false);
        recordingConfigRef.current = null;
        return;
      }

      const config = recordingConfigRef.current ?? {
        mode: activeEngine.getRecordingMode(),
        format: exportFormat,
        sampleRate: exportSampleRate,
        startedAt: Date.now(),
      };

      setIsFinalizingRecording(true);

      try {
        const recording = await activeEngine.stopRecording();
        setIsRecording(false);

        if (downloadImmediately) {
          const filename = await downloadRecording(recording, config);
          setStatusMessage(
            `Recording exported: ${filename}. ${getRecordingModeLabel(config.mode)}. ${
              config.format === 'wav'
                ? `Rendered WAV at ${config.sampleRate} kHz.`
                : `Browser encoded ${recording.type || getRecordingExtension(recording.type)}.`
            }`
          );
          return;
        }

        setPendingExport({
          id: `pending-${Date.now()}`,
          recording,
          config,
          stoppedAt: Date.now(),
          reason: reason as Exclude<RecordingStopReason, 'manual'>,
        });
        setStatusMessage('Recording finalized. Download or discard the pending export.');
      } catch (err) {
        console.error('Recording finalization error:', err);
        setIsRecording(false);
        setStatusMessage('Recording finalization failed.');
      } finally {
        recordingConfigRef.current = null;
        setIsFinalizingRecording(false);
      }
    })();

    recordingFinalizationRef.current = finalization;

    try {
      await finalization;
    } finally {
      recordingFinalizationRef.current = null;
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording && !ensureEngine().isCurrentlyRecording()) return;

    await finalizeRecording('manual', true);
  };

  const handleDownloadPendingExport = async () => {
    if (!pendingExport || isFinalizingRecording) return;

    setIsFinalizingRecording(true);

    try {
      const filename = await downloadRecording(pendingExport.recording, pendingExport.config);
      setPendingExport(null);
      setStatusMessage(`Pending recording exported: ${filename}.`);
    } catch (err) {
      console.error('Pending recording export error:', err);
      setStatusMessage('Pending recording export failed. The recording is still available.');
    } finally {
      setIsFinalizingRecording(false);
    }
  };

  const handleDiscardPendingExport = () => {
    if (!pendingExport || isFinalizingRecording) return;

    setPendingExport(null);
    setStatusMessage('Pending recording discarded.');
  };

  const currentPreset = activePresetId
    ? presets.find((preset) => preset.id === activePresetId)
    : undefined;
  const activeStatus = getPlaybackStatus(isPlaying, isFadingOut);
  const remainingLabel = timerRemaining !== null ? formatTime(timerRemaining) : '--:--';
  const builtInPresetCount = presets.filter((preset) => preset.id.startsWith('built-in-')).length;
  const presetCategoryCounts = countPresetsByCategory(presets);
  const filteredPresets = filterPresets(presets, presetSearch, presetCategory);
  const customBinauralPair = createBinauralPair(
    binauralBaseFrequency,
    customBinauralBeatFrequency
  );
  const customBinauralGuidance = customBinauralPair.guidance;
  const pendingBinauralPair = pendingBinauralActivation
    ? createBinauralPair(
        pendingBinauralActivation.baseFrequency,
        pendingBinauralActivation.beatFrequency
      )
    : null;
  const pendingBinauralLabel =
    pendingBinauralActivation?.label ??
    (pendingBinauralPair
      ? BINAURAL_PRESETS.find((preset) => preset.freq === pendingBinauralPair.beatFrequency)
          ?.name ?? 'Custom'
      : null);
  const currentPresetName = activePresetName ?? 'Manual Session';
  const currentPresetDisplayName = isActivePresetModified
    ? `${currentPresetName} · Modified`
    : currentPresetName;
  const creatorDraft = buildCreatorExportDraft({
    creatorSession,
    presetName: currentPresetName,
    recordingModeLabel: getRecordingModeLabel(recordingMode),
    isBinauralMode,
    headphonesRecommended: currentPreset?.headphonesRecommended ?? isBinauralMode,
  });

  const handleCopyCreatorDraft = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(creatorDraft.copyText);
        setShareMessage('Creator session notes copied.');
      } else {
        window.prompt('Copy these creator session notes:', creatorDraft.copyText);
        setShareMessage('Creator session notes generated.');
      }
    } catch (err) {
      console.error('Failed to copy creator session notes:', err);
      setShareMessage('Failed to copy creator session notes.');
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#060b18] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_45%_20%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_85%_55%,rgba(139,92,246,0.14),transparent_32%),linear-gradient(180deg,#070d1c_0%,#050816_55%,#030713_100%)]" />
      <div className="studio-shell relative flex min-h-screen flex-col px-5 md:px-6 2xl:px-8">
        <header className="flex flex-col gap-3 border-b border-white/10 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.22)]">
                <Disc3 size={22} className="text-cyan-300" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold leading-none tracking-tight md:text-3xl">Auralis</h1>
                <p className="text-xs text-slate-400 md:text-sm">
                  Somatic Frequency Generator & Binaural Entrainment
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <StatusPill tone={isFadingOut ? 'amber' : isPlaying ? 'emerald' : 'cyan'}>
                <Circle size={8} fill="currentColor" />
                {activeStatus}
              </StatusPill>
              <label className="flex min-w-[240px] items-center gap-3 text-slate-400">
                <Volume2 size={18} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterFX.masterVolume}
                  onChange={(event) => handleMasterVolumeChange(parseFloat(event.target.value))}
                  className="h-2 flex-1 accent-cyan-400"
                  aria-label="Master volume slider"
                />
                <span className="w-10 text-right text-slate-200">{percentInputValue(masterFX.masterVolume)}%</span>
              </label>
              <OutputMeter engine={engine} isPlaying={isAudible} className="w-full sm:w-[280px] lg:w-[260px]" />
              <select
                value={recordingMode}
                onChange={(event) => setRecordingMode(event.target.value as RecordingMode)}
                disabled={isRecording}
                aria-label="Recording mix mode"
                className="studio-select rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-400 disabled:opacity-50"
              >
                <option value="wet">{getRecordingModeLabel('wet')}</option>
                <option value="dry">{getRecordingModeLabel('dry')}</option>
              </select>
            </div>
          </div>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleStart}
                disabled={isPlaying}
                aria-label="Start audio playback"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[180px]"
              >
                <Play size={15} fill="currentColor" />
                Start Audio
              </button>
              <button
                onClick={handleStop}
                disabled={!isPlaying}
                aria-label="Stop audio playback"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/80 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(239,68,68,0.18)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[160px]"
              >
                <Square size={14} fill="currentColor" />
                Stop
              </button>
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  disabled={!isPlaying || Boolean(pendingExport) || isFinalizingRecording}
                  aria-label={`Start ${recordingMode} recording`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[190px]"
                >
                  <Download size={15} />
                  Record / Export
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  disabled={isFinalizingRecording}
                  aria-label="Stop recording and export audio"
                  className="inline-flex w-full animate-pulse items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-[190px]"
                >
                  <Square size={14} fill="currentColor" />
                  {isFinalizingRecording ? 'Finalizing…' : 'Stop Rec'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-white/10 text-sm text-slate-400 lg:border-l lg:pl-8">
              <span className="flex items-center gap-2">
                <Activity size={15} />
                Session
              </span>
              <span className="flex items-center gap-2 font-medium text-cyan-300">
                <Circle size={8} fill="currentColor" />
                {activeStatus}
              </span>
              {timerRemaining !== null && <span className="font-mono text-slate-200">{remainingLabel}</span>}
              {isRecording && <span className="text-red-300">REC {recordingMode.toUpperCase()}</span>}
            </div>
          </section>
        </header>

        <div className="grid w-full gap-5 py-5 xl:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside className="w-full">
            <section className="studio-panel h-full overflow-hidden rounded-2xl">
            <nav className="p-2">
              {[
                { label: 'Session', icon: AudioWaveform },
                { label: 'Sound Lab', icon: SlidersHorizontal },
                { label: 'Presets', icon: Library },
                { label: 'Recorder', icon: Radio },
                { label: 'Settings', icon: Settings },
              ].map(({ label, icon: Icon }, index) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    index === 0
                      ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/25 text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </a>
              ))}
            </nav>

            <div className="border-t border-white/10 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-500">Current Preset</p>
              <div className="flex gap-3">
                <div className="grid h-16 w-16 place-items-center rounded-xl border border-violet-400/30 bg-gradient-to-br from-cyan-500/25 to-violet-500/30 text-3xl">
                  <Moon size={28} className="text-violet-200" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">{currentPresetDisplayName}</p>
                  <p className="text-xs text-cyan-300">{builtInPresetCount} built-in presets</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-500">Last Export</p>
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">✓</span>
                <div>
                  <p className="break-all text-sm text-slate-200">{lastExportName ?? 'No export yet'}</p>
                  <p className="text-xs text-slate-500">{recordingMode.toUpperCase()} mix ready</p>
                </div>
              </div>
            </div>
            </section>
          </aside>

            <section id="session" className="studio-panel flex h-full min-w-0 flex-col overflow-hidden rounded-2xl">
              <div className="grid flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-100">Audio Visualizer</h2>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-400">
                        Signal Flow
                      </span>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-cyan-400/40 hover:text-slate-100"
                        aria-label="Expand visualizer"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </div>
                  <Visualizer isActive={isAudible} />
                </div>
                <div className="border-t border-white/10 p-5 xl:border-l xl:border-t-0">
                  <h3 className="mb-5 text-sm font-semibold text-slate-300">Session Overview</h3>
                  <dl className="space-y-4 text-sm">
                    <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                      <dt className="text-slate-500">Remaining</dt>
                      <dd className="font-mono text-slate-100">{remainingLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                      <dt className="text-slate-500">Fade-out</dt>
                      <dd className="text-slate-100">10s</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Status</dt>
                      <dd className={isFadingOut ? 'text-amber-300' : isPlaying ? 'text-emerald-300' : 'text-cyan-300'}>{activeStatus}</dd>
                    </div>
                  </dl>
                  <p className="mt-6 text-xs leading-5 text-slate-500">
                    Use stereo headphones for binaural modes. Start with low volume, stop if the sound feels uncomfortable, and do not use Auralis as medical treatment or diagnosis.
                  </p>
                </div>
              </div>

              <div className="mt-auto border-t border-white/10 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">Brainwave Entrainment</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                      Binaural designs need stereo headphones. Beat ranges are descriptive only; they do not guarantee a brain state.
                    </p>
                  </div>
                  {!isBinauralMode && (
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Base</span>
                      <input
                        type="number"
                        min="20"
                        max={MAX_BINAURAL_CARRIER_FREQUENCY - MIN_BINAURAL_BEAT_FREQUENCY}
                        step="0.01"
                        value={Number(binauralBaseFrequency.toFixed(2))}
                        onChange={(event) => {
                          const parsedValue = parseFloat(event.target.value);
                          if (!Number.isNaN(parsedValue)) {
                            setBinauralBaseFrequency(
                              normalizeBinauralBaseFrequency(parsedValue, customBinauralBeatFrequency)
                            );
                          }
                        }}
                        className={numberInputClass}
                        aria-label="Binaural base frequency in hertz"
                      />
                      <span>Hz</span>
                    </label>
                  )}
                </div>

                {isBinauralMode ? (
                  <div className="flex flex-col gap-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      {(() => {
                        const activeBeatFrequency = Number(binauralPreset?.match(/\+ (\d+(?:\.\d+)?)Hz/)?.[1] ?? 0);
                        const guidance = getBinauralGuidance(activeBeatFrequency);

                        return (
                          <>
                            <p className="font-medium text-emerald-300">Binaural Mode Active</p>
                            <p className="text-sm text-slate-400">
                              {binauralPreset ?? 'Oscillators 1 & 2 panned hard L/R with beat frequency'}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{guidance.caution}</p>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={exitBinaural}
                      className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
                    >
                      Exit Binaural Mode
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-5">
                      {BINAURAL_PRESETS.map((preset) => {
                        const guidance = getBinauralGuidance(preset.freq);

                        return (
                          <button
                            key={preset.name}
                            onClick={() => activateBinaural(binauralBaseFrequency, preset.freq)}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                            aria-label={`Activate ${preset.name} binaural preset at ${preset.freq} hertz. ${guidance.label}. ${guidance.caution}`}
                          >
                            <span className="block font-semibold text-slate-100">{preset.name}</span>
                            <span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                              {preset.freq} Hz
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BINAURAL_TONE_CLASSES[guidance.tone]}`}>
                                {guidance.label}
                              </span>
                            </span>
                            <span className="mt-2 block text-xs leading-4 text-slate-500">{guidance.summary}</span>
                          </button>
                        );
                      })}
                    </div>

                    {pendingBinauralPair && !hasAcknowledgedBinauralSafety && (
                      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="max-w-3xl">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Headphones size={16} className="text-amber-200" />
                              <h3 className="text-sm font-semibold text-amber-100">
                                Confirm Binaural Listening Setup
                              </h3>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BINAURAL_TONE_CLASSES[pendingBinauralPair.guidance.tone]}`}>
                                {pendingBinauralPair.guidance.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300">
                              {pendingBinauralLabel} will use{' '}
                              <span className="font-mono text-slate-100">
                                L {formatBinauralNumber(pendingBinauralPair.baseFrequency)} Hz / R{' '}
                                {formatBinauralNumber(pendingBinauralPair.upperFrequency)} Hz
                              </span>
                              .
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              Use stereo headphones, start at low volume, and stop if the sound feels uncomfortable. Binaural beat ranges are descriptive only and do not guarantee a brain state.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                            <button
                              type="button"
                              onClick={confirmBinauralSafety}
                              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
                            >
                              I’m Using Headphones
                            </button>
                            <button
                              type="button"
                              onClick={cancelBinauralSafety}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-100">Custom Binaural Builder</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BINAURAL_TONE_CLASSES[customBinauralGuidance.tone]}`}>
                              {customBinauralGuidance.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Type an exact beat difference and preview the generated left/right carrier pair.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            activateBinaural(
                              customBinauralPair.baseFrequency,
                              customBinauralPair.beatFrequency,
                              `Custom ${formatBinauralNumber(customBinauralPair.beatFrequency)}Hz`
                            )
                          }
                          className="inline-flex items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
                        >
                          Activate Custom Pair
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
                        <label className="space-y-1 text-xs text-slate-400">
                          <span>Beat Difference</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={MIN_BINAURAL_BEAT_FREQUENCY}
                              max={MAX_BINAURAL_BEAT_FREQUENCY}
                              step="0.1"
                              value={Number(customBinauralBeatFrequency.toFixed(2))}
                              onChange={(event) => {
                                const parsedValue = parseFloat(event.target.value);
                                if (!Number.isNaN(parsedValue)) {
                                  const safeBeatFrequency = normalizeBinauralBeatFrequency(parsedValue);

                                  setCustomBinauralBeatFrequency(safeBeatFrequency);
                                  setBinauralBaseFrequency((currentBaseFrequency) =>
                                    normalizeBinauralBaseFrequency(
                                      currentBaseFrequency,
                                      safeBeatFrequency
                                    )
                                  );
                                }
                              }}
                              className={numberInputClass}
                              aria-label="Custom binaural beat difference in hertz"
                            />
                            <span>Hz</span>
                          </div>
                        </label>

                        <div className="space-y-1 text-xs text-slate-400">
                          <span>Carrier Pair</span>
                          <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 font-mono text-slate-200">
                            L {formatBinauralNumber(customBinauralPair.baseFrequency)} Hz
                            <span className="mx-2 text-slate-600">/</span>
                            R {formatBinauralNumber(customBinauralPair.upperFrequency)} Hz
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-xs leading-5 text-slate-500">
                          <p className="text-slate-400">{customBinauralGuidance.summary}</p>
                          <p>{customBinauralGuidance.caution}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

          <aside className="w-full space-y-4 xl:w-[360px]">
            <Timer
              duration={timerDuration}
              remaining={timerRemaining}
              isPlaying={isPlaying}
              onSetDuration={setTimerDuration}
              onSetRemaining={setTimerRemaining}
              onComplete={handleTimerComplete}
            />

            <GlassPanel id="recorder" className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.8)]" />
                <h2 className="text-sm font-semibold text-slate-100">Recording & Export</h2>
              </div>
              <div className="space-y-2.5">
                <label className="block text-xs text-slate-500">
                  Format Target
                  <select
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                  >
                    <option value="webm">WebM / Browser native</option>
                    <option value="wav">WAV target</option>
                  </select>
                </label>
                <label className="block text-xs text-slate-500">
                  Sample Rate Target
                  <select
                    value={exportSampleRate}
                    onChange={(event) => setExportSampleRate(event.target.value as ExportSampleRate)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                  >
                    <option value="44.1">44.1 kHz</option>
                    <option value="48">48 kHz</option>
                  </select>
                </label>
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={
                    isFinalizingRecording ||
                    (!isPlaying && !isRecording) ||
                    (!isRecording && Boolean(pendingExport))
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={15} />
                  {isFinalizingRecording
                    ? 'Finalizing…'
                    : isRecording
                      ? 'Export Recording'
                      : 'Arm Recorder'}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  {getRecordingModeDescription(recordingMode)} Browser-native capture; WAV targets render on export.
                </p>
                {pendingExport && (
                  <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3" role="status">
                    <div>
                      <p className="text-sm font-semibold text-amber-100">Pending Export</p>
                      <p className="mt-1 text-xs leading-5 text-amber-100/70">
                        {pendingExport.reason === 'timer_complete'
                          ? 'The session timer completed.'
                          : 'Playback stopped.'}{' '}
                        {getRecordingModeLabel(pendingExport.config.mode)} · {pendingExport.config.format.toUpperCase()} · {pendingExport.config.sampleRate} kHz
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadPendingExport}
                        disabled={isFinalizingRecording}
                        className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={handleDiscardPendingExport}
                        disabled={isFinalizingRecording}
                        className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.1] disabled:opacity-50"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </GlassPanel>

            {(statusMessage || shareMessage) && (
              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-200" aria-live="polite">
                {statusMessage && <p>{statusMessage}</p>}
                {shareMessage && <p>{shareMessage}</p>}
              </section>
            )}
          </aside>
        <GlassPanel id="sound-lab" className="p-5 xl:col-span-3">
          <SectionHeader title="Master Chain" description="Final signal shaping before output and recording." />
          {isBinauralMode && (
            <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100" role="status">
              Binaural Lock is active. Effects, movement, noise, and textures are bypassed until you exit binaural mode.
            </div>
          )}
          <fieldset disabled={isBinauralMode} className="disabled:opacity-60">
            <legend className="sr-only">Master chain controls</legend>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <Card className={`space-y-3 p-4 ${noiseEnabled ? 'border-cyan-400/30 shadow-[0_0_32px_rgba(34,211,238,0.1)]' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Waves size={16} className="text-cyan-300" />
                  Noise Layer
                </h3>
                <ToggleSwitch
                  checked={noiseEnabled}
                  onChange={handleNoiseToggle}
                  label="Toggle noise layer"
                />
              </div>
              <select
                value={noiseType}
                onChange={(event) => handleNoiseTypeChange(event.target.value as NoiseType)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              >
                {NOISE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)} Noise
                  </option>
                ))}
              </select>
              <ControlSlider
                label="Volume"
                value={noiseGain}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(noiseGain)}%`}
                onChange={handleNoiseGainChange}
                tone="cyan"
              />
              <ControlSlider
                label="High-pass"
                value={noiseHighpassFrequency}
                min={20}
                max={500}
                step={1}
                readout={formatFilterFrequency(noiseHighpassFrequency)}
                onChange={handleNoiseHighpassChange}
                tone="cyan"
              />
              <ControlSlider
                label="Low-pass"
                value={noiseLowpassFrequency}
                min={500}
                max={12000}
                step={10}
                readout={formatFilterFrequency(noiseLowpassFrequency)}
                onChange={handleNoiseLowpassChange}
                tone="cyan"
              />
              <ControlSlider
                label="Stereo Width"
                value={noiseStereoWidth}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(noiseStereoWidth)}%`}
                onChange={handleNoiseStereoWidthChange}
                tone="cyan"
              />
            </Card>

            <Card className={`space-y-3 p-4 ${textureLayer.enabled ? 'border-emerald-400/30 shadow-[0_0_32px_rgba(16,185,129,0.1)]' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <CloudRain size={16} className="text-emerald-300" />
                  Texture Layer
                </h3>
                <ToggleSwitch
                  checked={textureLayer.enabled}
                  onChange={handleTextureToggle}
                  label="Toggle texture layer"
                />
              </div>
              <select
                value={textureLayer.type}
                onChange={(event) => handleTextureTypeChange(event.target.value as TextureType)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
              >
                {TEXTURE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ControlSlider
                label="Level"
                value={textureLayer.gain}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(textureLayer.gain)}%`}
                onChange={handleTextureGainChange}
                tone="emerald"
              />
              <ControlSlider
                label="Tone"
                value={textureLayer.tone}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(textureLayer.tone)}%`}
                onChange={handleTextureToneChange}
                tone="emerald"
              />
              <ControlSlider
                label="Width"
                value={textureLayer.width}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(textureLayer.width)}%`}
                onChange={handleTextureWidthChange}
                tone="emerald"
              />
              <ControlSlider
                label="Motion"
                value={textureLayer.motion}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(textureLayer.motion)}%`}
                onChange={handleTextureMotionChange}
                tone="emerald"
              />
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Boxes size={16} className="text-violet-300" />
                Reverb
              </h3>
              <ControlSlider
                label="Wet / Dry"
                value={masterFX.reverbWet}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(masterFX.reverbWet)}%`}
                onChange={handleReverbChange}
                tone="violet"
              />
              <ControlSlider
                label="Decay"
                value={masterFX.reverbDecay}
                min={0.2}
                max={12}
                step={0.1}
                readout={`${masterFX.reverbDecay.toFixed(1)}s`}
                onChange={handleReverbDecayChange}
                tone="violet"
              />
              <ControlSlider
                label="Pre-delay"
                value={masterFX.reverbPreDelay}
                min={0}
                max={0.5}
                step={0.01}
                readout={`${Math.round(masterFX.reverbPreDelay * 1000)} ms`}
                onChange={handleReverbPreDelayChange}
                tone="violet"
              />
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Gauge size={16} className="text-cyan-300" />
                Output Safety
              </h3>
              <ControlSlider
                label="Limiter Ceiling"
                value={masterFX.limiterThresholdDb}
                min={-12}
                max={-0.1}
                step={0.1}
                readout={`${masterFX.limiterThresholdDb.toFixed(1)} dB`}
                onChange={handleLimiterThresholdChange}
                tone="cyan"
              />
              <ControlSlider
                label="Stereo Width"
                value={masterFX.stereoWidth}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(masterFX.stereoWidth)}%`}
                onChange={handleStereoWidthChange}
                tone="cyan"
              />
            </Card>

            <Card className={`space-y-3 p-4 ${masterFX.eqEnabled ? 'border-emerald-400/30 shadow-[0_0_32px_rgba(16,185,129,0.08)]' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <SlidersHorizontal size={16} className="text-emerald-300" />
                  EQ
                </h3>
                <ToggleSwitch
                  checked={masterFX.eqEnabled}
                  onChange={handleEqEnabledChange}
                  label="Toggle master EQ"
                />
              </div>
              <ControlSlider
                label="Low"
                value={masterFX.eqLowGain}
                min={-12}
                max={12}
                step={0.5}
                readout={`${masterFX.eqLowGain.toFixed(1)} dB`}
                onChange={(gain) => handleEqGainChange('low', gain)}
                tone="emerald"
              />
              <ControlSlider
                label="Mid"
                value={masterFX.eqMidGain}
                min={-12}
                max={12}
                step={0.5}
                readout={`${masterFX.eqMidGain.toFixed(1)} dB`}
                onChange={(gain) => handleEqGainChange('mid', gain)}
                tone="emerald"
              />
              <ControlSlider
                label="High"
                value={masterFX.eqHighGain}
                min={-12}
                max={12}
                step={0.5}
                readout={`${masterFX.eqHighGain.toFixed(1)} dB`}
                onChange={(gain) => handleEqGainChange('high', gain)}
                tone="emerald"
              />
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Gauge size={16} className="text-violet-300" />
                Auto-Panner
              </h3>
              <ControlSlider
                label="Speed"
                value={masterFX.autoPannerRate}
                min={0}
                max={20}
                step={0.01}
                readout={`${masterFX.autoPannerRate.toFixed(2)} Hz`}
                onChange={handleAutoPannerRateChange}
                tone="violet"
              />
              <ControlSlider
                label="Depth"
                value={masterFX.autoPannerDepth}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(masterFX.autoPannerDepth)}%`}
                onChange={handleAutoPannerDepthChange}
                tone="violet"
              />
            </Card>

            <Card className={`space-y-3 p-4 ${masterFX.delayEnabled || masterFX.chorusEnabled ? 'border-fuchsia-400/30 shadow-[0_0_32px_rgba(217,70,239,0.08)]' : ''}`}>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <span className="text-xs font-semibold text-slate-300">Delay</span>
                  <ToggleSwitch
                    checked={masterFX.delayEnabled}
                    onChange={handleDelayEnabledChange}
                    label="Toggle delay"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <span className="text-xs font-semibold text-slate-300">Chorus</span>
                  <ToggleSwitch
                    checked={masterFX.chorusEnabled}
                    onChange={handleChorusEnabledChange}
                    label="Toggle chorus"
                  />
                </div>
              </div>
              <ControlSlider
                label="Delay Wet"
                value={masterFX.delayWet}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(masterFX.delayWet)}%`}
                onChange={handleDelayWetChange}
                tone="violet"
              />
              <ControlSlider
                label="Delay Time"
                value={masterFX.delayTime}
                min={0.01}
                max={1}
                step={0.01}
                readout={`${masterFX.delayTime.toFixed(2)}s`}
                onChange={handleDelayTimeChange}
                tone="violet"
              />
              <ControlSlider
                label="Feedback"
                value={masterFX.delayFeedback}
                min={0}
                max={0.9}
                step={0.01}
                readout={`${percentInputValue(masterFX.delayFeedback)}%`}
                onChange={handleDelayFeedbackChange}
                tone="violet"
              />
              <ControlSlider
                label="Chorus Wet"
                value={masterFX.chorusWet}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(masterFX.chorusWet)}%`}
                onChange={handleChorusWetChange}
                tone="violet"
              />
              <ControlSlider
                label="Chorus Rate"
                value={masterFX.chorusRate}
                min={0.05}
                max={8}
                step={0.05}
                readout={`${masterFX.chorusRate.toFixed(2)} Hz`}
                onChange={handleChorusRateChange}
                tone="violet"
              />
              <ControlSlider
                label="Chorus Depth"
                value={masterFX.chorusDepth}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(masterFX.chorusDepth)}%`}
                onChange={handleChorusDepthChange}
                tone="violet"
              />
            </Card>

            <Card className={`space-y-3 p-4 ${modulation.mode !== 'off' ? 'border-amber-400/30 shadow-[0_0_32px_rgba(251,191,36,0.08)]' : ''}`}>
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Sparkles size={16} className="text-amber-300" />
                Modulation
              </h3>
              <select
                value={modulation.mode}
                onChange={(event) => handleModulationModeChange(event.target.value as ModulationMode)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
              >
                {MODULATION_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <ControlSlider
                label="Rate"
                value={modulation.rate}
                min={0.01}
                max={1}
                step={0.01}
                readout={`${modulation.rate.toFixed(2)} Hz`}
                onChange={handleModulationRateChange}
                tone="amber"
              />
              <ControlSlider
                label="Depth"
                value={modulation.depth}
                min={0}
                max={1}
                step={0.01}
                readout={`${percentInputValue(modulation.depth)}%`}
                onChange={handleModulationDepthChange}
                tone="amber"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'noiseFilter', label: 'Filter' },
                  { key: 'noiseWidth', label: 'Width' },
                  { key: 'oscillatorPan', label: 'Pan' },
                ].map((target) => (
                  <button
                    key={target.key}
                    type="button"
                    onClick={() =>
                      handleModulationTargetChange(
                        target.key as keyof ModulationState['targets'],
                        !modulation.targets[target.key as keyof ModulationState['targets']]
                      )
                    }
                    aria-pressed={modulation.targets[target.key as keyof ModulationState['targets']]}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                      modulation.targets[target.key as keyof ModulationState['targets']]
                        ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                        : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {target.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Headphones size={16} className="text-cyan-300" />
                Signal Chain
              </h3>
              <div className="grid grid-cols-6 items-start gap-2 text-center text-xs text-slate-400">
                {[
                  { label: 'Oscillators', icon: AudioWaveform },
                  { label: 'Noise', icon: Waves },
                  { label: 'Texture', icon: CloudRain },
                  { label: 'Effects', icon: Boxes },
                  { label: 'Limiter', icon: Gauge },
                  { label: 'Output', icon: Headphones },
                ].map(({ label, icon: Icon }, index) => (
                  <div key={label} className="relative space-y-2">
                    {index < 5 && (
                      <span className="absolute left-[calc(50%+1.35rem)] top-5 hidden h-px w-[calc(100%-1.35rem)] bg-gradient-to-r from-cyan-400/45 to-violet-400/35 md:block" />
                    )}
                    <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
                      <Icon size={16} />
                    </div>
                    <p className="leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </Card>
            </div>
          </fieldset>
        </GlassPanel>

        <section className="space-y-4 xl:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Oscillator Rack</h2>
              <p className="text-sm text-slate-500">
                {isBinauralMode
                  ? 'Strict carrier pair is locked until binaural mode exits.'
                  : 'Four tone layers for frequency, gain, pan, waveform, and tremolo.'}
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex rounded-full border border-white/10 bg-slate-950/60 p-1">
                {[
                  { value: 'free', label: 'Free' },
                  { value: 'harmonic', label: 'Harmonic Link' },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => handleFrequencyLinkModeChange(mode.value as FrequencyLinkMode)}
                    disabled={isBinauralMode}
                    aria-pressed={frequencyLinkMode === mode.value}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      frequencyLinkMode === mode.value
                        ? 'bg-cyan-400/20 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)]'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                4 active layers
              </span>
            </div>
          </div>
          <fieldset
            disabled={isBinauralMode}
            className="grid grid-cols-1 gap-4 disabled:opacity-70 md:grid-cols-2 lg:grid-cols-4"
          >
            <legend className="sr-only">Oscillator rack controls</legend>
            {oscillators.map((oscillator, index) => (
              <OscillatorPanel
                key={index}
                index={index}
                frequency={oscillator.frequency}
                detuneCents={oscillator.detuneCents}
                gain={oscillator.gain}
                waveform={oscillator.waveform}
                pan={oscillator.pan}
                phaseDegrees={oscillator.phaseDegrees}
                muted={oscillator.muted}
                soloed={oscillator.soloed}
                tremoloEnabled={oscillator.tremoloEnabled}
                tremoloShape={oscillator.tremoloShape}
                tremoloRate={oscillator.tremoloRate}
                tremoloDepth={oscillator.tremoloDepth}
                attackSeconds={oscillator.attackSeconds}
                releaseSeconds={oscillator.releaseSeconds}
                onFrequencyChange={(value) => handleFrequencyChange(index, value)}
                onDetuneChange={(detuneCents) => handleDetuneChange(index, detuneCents)}
                onGainChange={(gain) => handleGainChange(index, gain)}
                onWaveformChange={(waveform) => handleWaveformChange(index, waveform)}
                onPanChange={(pan) => handlePanChange(index, pan)}
                onPhaseChange={(phaseDegrees) => handlePhaseChange(index, phaseDegrees)}
                onMuteToggle={(muted) => handleMuteToggle(index, muted)}
                onSoloToggle={(soloed) => handleSoloToggle(index, soloed)}
                onTremoloToggle={(enabled) => handleTremoloToggle(index, enabled)}
                onTremoloShapeChange={(shape) => handleTremoloShapeChange(index, shape)}
                onTremoloRateChange={(rate) => handleTremoloRateChange(index, rate)}
                onTremoloDepthChange={(depth) => handleTremoloDepthChange(index, depth)}
                onEnvelopeChange={(attackSeconds, releaseSeconds) =>
                  handleEnvelopeChange(index, attackSeconds, releaseSeconds)
                }
              />
            ))}
          </fieldset>
        </section>

        <GlassPanel id="presets" className="p-5 xl:col-span-3">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader
              title="Preset Library"
              description="Save, load, search, and share repeatable sound sessions."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center">
              <label className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="search"
                  value={presetSearch}
                  onChange={(event) => setPresetSearch(event.target.value)}
                  placeholder="Search presets..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-9 pr-4 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Preset name..."
                className="min-w-[220px] rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                onKeyDown={(event) => event.key === 'Enter' && handleSavePreset()}
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                aria-label="Save current settings as preset"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={15} />
                Save Preset
              </button>
              <button
                onClick={handleSharePreset}
                aria-label="Copy share link for current settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <Share2 size={15} />
                Share
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {PRESET_CATEGORY_OPTIONS.map((category) => {
              const isActiveCategory = presetCategory === category.value;

              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setPresetCategory(category.value)}
                  aria-pressed={isActiveCategory}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isActiveCategory
                      ? 'border-cyan-400/45 bg-cyan-400/15 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.1)]'
                      : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-400/30 hover:text-slate-200'
                  }`}
                >
                  {category.label}
                  <span className="font-mono text-[10px] opacity-70">
                    {presetCategoryCounts[category.value] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-5 grid gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 lg:grid-cols-[1fr_1fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-3">
              <label className="block text-xs text-slate-500">
                Creator Title
                <input
                  type="text"
                  value={creatorSession.title}
                  onChange={(event) => handleCreatorFieldChange('title', event.target.value)}
                  placeholder={currentPresetName}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Purpose
                <input
                  type="text"
                  value={creatorSession.purpose}
                  onChange={(event) => handleCreatorFieldChange('purpose', event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Target Duration
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    step="1"
                    value={numberInputValue(creatorSession.durationMinutes)}
                    onChange={(event) => {
                      const parsedValue = parseFloat(event.target.value);

                      if (!Number.isNaN(parsedValue)) {
                        handleCreatorFieldChange('durationMinutes', parsedValue);
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    aria-label="Creator target duration in minutes"
                  />
                  <span className="text-xs text-slate-500">min</span>
                </div>
              </label>
              <label className="block text-xs text-slate-500">
                Filename Stem
                <input
                  type="text"
                  value={creatorSession.exportSlug}
                  onChange={(event) => handleCreatorFieldChange('exportSlug', event.target.value)}
                  placeholder={creatorDraft.fileNameStem}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Visual Theme
                <input
                  type="text"
                  value={creatorSession.visualTheme}
                  onChange={(event) => handleCreatorFieldChange('visualTheme', event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Session Notes
                <input
                  type="text"
                  value={creatorSession.notes}
                  onChange={(event) => handleCreatorFieldChange('notes', event.target.value)}
                  placeholder="Optional export notes..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
              <label className="block text-xs text-slate-500 xl:col-span-3">
                Storyboard Notes
                <input
                  type="text"
                  value={creatorSession.storyboardNotes}
                  onChange={(event) => handleCreatorFieldChange('storyboardNotes', event.target.value)}
                  placeholder="Optional visualizer/camera notes for long-form capture..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
              </label>
            </div>
            <div className="flex flex-col justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-200">Creator Session</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  {creatorDraft.title} · {creatorDraft.durationLabel}
                </p>
                <p className="mt-1 max-w-xs break-all font-mono text-[11px] text-cyan-300">
                  {creatorDraft.fileNameStem}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyCreatorDraft}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                <Copy size={15} />
                Copy Notes
              </button>
            </div>
          </div>

          {filteredPresets.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {filteredPresets.map((preset) => {
                const isBuiltInPreset = preset.id.startsWith('built-in-');

                return (
                  <div
                    key={preset.id}
                    className="group studio-card flex min-h-[150px] items-center justify-between gap-3 rounded-xl p-3"
                  >
                    <PresetArtwork name={preset.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <p className="overflow-hidden font-medium leading-snug text-slate-200 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{preset.name}</p>
                        {isBuiltInPreset && (
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-300">
                            Built-in
                          </span>
                        )}
                        {preset.headphonesRecommended && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-200"
                            title={preset.caution}
                          >
                            <Headphones size={10} />
                            Phones
                          </span>
                        )}
                        {preset.exportReady && (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                            Export
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-cyan-300">{preset.intendedUse}</p>
                      <p
                        className="mt-1 overflow-hidden text-xs leading-4 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                        title={preset.caution}
                      >
                        {preset.description}
                      </p>
                      {preset.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {preset.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-slate-600">{new Date(preset.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleLoadPreset(preset.id, preset.name)}
                        className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-cyan-400/10"
                        aria-label={`Load preset ${preset.name}`}
                      >
                        Load
                      </button>
                      {!isBuiltInPreset && (
                        <button
                          onClick={() => {
                            deletePreset(preset.id);
                            analytics.trackPresetDelete(preset.name);
                            setShareMessage(`Deleted preset: ${preset.name}`);
                          }}
                          className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                          aria-label={`Delete preset ${preset.name}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {presetSearch.trim()
                ? 'No presets match that search.'
                : presetCategory !== 'all'
                  ? 'No presets match this category yet.'
                  : 'No presets saved yet. Create a soundscape and save it.'}
            </p>
          )}
        </GlassPanel>

        <footer className="px-4 pb-5 text-center text-xs text-slate-600 md:px-6 xl:col-span-3 xl:px-8">
          <p>Auralis v{packageJson.version} is an experimental wellness and audio tool for relaxation and focus. It is not medical software or a substitute for professional medical advice.</p>
        </footer>
        </div>
      </div>
    </main>
  );
}
