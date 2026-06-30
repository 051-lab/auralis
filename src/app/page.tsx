'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AudioWaveform,
  Boxes,
  Circle,
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
  Square,
  Volume2,
  Waves,
} from 'lucide-react';
import { getAudioEngine } from '@/lib/audioEngine';
import type { NoiseType, RecordingMode, WaveformType } from '@/lib/audioEngine';
import { useAuralisStore } from '@/store/useAuralisStore';
import type { MasterFXState, OscillatorState, SharedPresetPayload } from '@/store/useAuralisStore';
import { OscillatorPanel } from '@/components/OscillatorPanel';
import { Visualizer } from '@/components/Visualizer';
import { Timer } from '@/components/Timer';
import { linearToLogFrequency } from '@/utils/audioMath';
import { clamp } from '@/utils/math';
import { decodeSharedPreset, encodeSharedPreset } from '@/utils/sharePreset';
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
const MAX_SHARE_URL_LENGTH = 2000;
type ExportFormat = 'wav' | 'webm';
type ExportSampleRate = '44.1' | '48';

function getRecordingExtension(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

function encodeWav24(audioBuffer: AudioBuffer): Blob {
  const channelCount = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;
  const bytesPerSample = 3;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: channelCount }, (_, index) =>
    audioBuffer.getChannelData(index)
  );
  let offset = 44;

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame] || 0));
      const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
      const value = Math.round(intSample);

      view.setUint8(offset, value & 0xff);
      view.setUint8(offset + 1, (value >> 8) & 0xff);
      view.setUint8(offset + 2, (value >> 16) & 0xff);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate) return audioBuffer;

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );
  const source = offlineContext.createBufferSource();

  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  return offlineContext.startRendering();
}

async function createExportBlob(
  recording: Blob,
  exportFormat: ExportFormat,
  exportSampleRate: ExportSampleRate
): Promise<Blob> {
  if (exportFormat !== 'wav') return recording;

  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not available for WAV export');
  }

  const audioContext = new AudioContextConstructor();
  const decodedBuffer = await audioContext.decodeAudioData(await recording.arrayBuffer());
  const targetSampleRate = exportSampleRate === '44.1' ? 44100 : 48000;
  const renderedBuffer = await resampleAudioBuffer(decodedBuffer, targetSampleRate);

  await audioContext.close();

  return encodeWav24(renderedBuffer);
}

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

export default function Home() {
  const [engine, setEngine] = useState<AudioEngineInstance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('wet');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webm');
  const [exportSampleRate, setExportSampleRate] = useState<ExportSampleRate>('48');
  const [binauralBaseFrequency, setBinauralBaseFrequency] = useState(400);
  const [presetSearch, setPresetSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [lastExportName, setLastExportName] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const binauralSnapshotRef = useRef<OscillatorState[] | null>(null);
  const binauralMasterFXSnapshotRef = useRef<MasterFXState | null>(null);
  const previousSyncRef = useRef<{
    oscillators: OscillatorState[];
    masterFX: MasterFXState;
    noiseType: NoiseType;
    noiseGain: number;
    noiseEnabled: boolean;
    isPlaying: boolean;
  } | null>(null);

  useAnalytics();

  const {
    oscillators,
    masterFX,
    isBinauralMode,
    binauralPreset,
    presets,
    timerDuration,
    timerRemaining,
    isRecording,
    noiseEnabled,
    noiseType,
    noiseGain,
    setOscillatorFrequency,
    setOscillatorGain,
    setOscillatorWaveform,
    setOscillatorPan,
    setOscillatorTremoloEnabled,
    setOscillatorTremoloRate,
    setOscillatorTremoloDepth,
    setMasterVolume,
    setReverbWet,
    setReverbDecay,
    setAutoPannerRate,
    setAutoPannerDepth,
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
    applySharedPreset,
  } = useAuralisStore();

  useEffect(() => {
    setEngine(getAudioEngine());
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

    oscillators.forEach((oscillator, index) => {
      const previousOscillator = previous?.oscillators[index];

      if (!previousOscillator || previousOscillator.frequency !== oscillator.frequency) {
        engine.setFrequency(index, oscillator.frequency);
      }

      if (!previousOscillator || previousOscillator.gain !== oscillator.gain) {
        engine.setGain(index, oscillator.gain);
      }

      if (!previousOscillator || previousOscillator.waveform !== oscillator.waveform) {
        engine.setWaveform(index, oscillator.waveform);
      }

      if (!previousOscillator || previousOscillator.pan !== oscillator.pan) {
        engine.setPan(index, oscillator.pan);
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

    if (!previous || previous.masterFX.reverbWet !== masterFX.reverbWet) {
      engine.setReverbWet(masterFX.reverbWet);
    }

    if (!previous || previous.masterFX.reverbDecay !== masterFX.reverbDecay) {
      engine.setReverbDecay(masterFX.reverbDecay);
    }

    if (!previous || previous.masterFX.autoPannerRate !== masterFX.autoPannerRate) {
      engine.setAutoPannerRate(masterFX.autoPannerRate);
    }

    if (!previous || previous.masterFX.autoPannerDepth !== masterFX.autoPannerDepth) {
      engine.setAutoPannerDepth(masterFX.autoPannerDepth);
    }

    if (!previous || previous.noiseType !== noiseType) {
      engine.setNoiseType(noiseType);
    }

    if (!previous || previous.noiseGain !== noiseGain) {
      engine.setNoiseGain(noiseGain);
    }

    if (isPlaying && noiseEnabled && noiseGain > 0) {
      engine.startNoise();
    } else {
      engine.stopNoise();
    }

    previousSyncRef.current = {
      oscillators: oscillators.map((oscillator) => ({ ...oscillator })),
      masterFX: { ...masterFX },
      noiseType,
      noiseGain,
      noiseEnabled,
      isPlaying,
    };
  }, [engine, oscillators, masterFX, noiseEnabled, noiseType, noiseGain, isPlaying]);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (isPlaying && 'wakeLock' in navigator) {
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
      if (document.visibilityState === 'visible' && isPlaying && 'wakeLock' in navigator) {
        await requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLockRef.current?.release();
    };
  }, [isPlaying]);

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

    await activeEngine.start();

    if (noiseEnabled && noiseGain > 0) {
      activeEngine.startNoise();
    }

    setIsPlaying(true);
    analytics.trackAudioStart();
  };

  const handleStop = async () => {
    const activeEngine = ensureEngine();

    await activeEngine.fadeOutAndStop(2);

    setIsPlaying(false);
    analytics.trackAudioStop('manual');

    if (timerRemaining !== null && timerRemaining > 0) {
      setTimerDuration(null);
      setTimerRemaining(null);
    }
  };

  const handleTimerComplete = async () => {
    const activeEngine = ensureEngine();

    await activeEngine.fadeOutAndStop(10);
    setIsPlaying(false);
    setTimerDuration(null);
    setTimerRemaining(null);
    analytics.trackAudioStop('timer_complete');
    setStatusMessage('Session timer complete. Audio faded out smoothly.');
  };

  const handleFrequencyChange = (index: number, linearValue: number) => {
    const freq = linearToLogFrequency(linearValue, 20, 20000);
    setOscillatorFrequency(index, freq);
  };

  const handleGainChange = (index: number, gain: number) => {
    setOscillatorGain(index, gain);
  };

  const handleWaveformChange = (index: number, waveform: WaveformType) => {
    setOscillatorWaveform(index, waveform);
  };

  const handlePanChange = (index: number, pan: number) => {
    setOscillatorPan(index, pan);
  };

  const handleTremoloToggle = (index: number, enabled: boolean) => {
    setOscillatorTremoloEnabled(index, enabled);
  };

  const handleTremoloRateChange = (index: number, rate: number) => {
    setOscillatorTremoloRate(index, rate);
  };

  const handleTremoloDepthChange = (index: number, depth: number) => {
    setOscillatorTremoloDepth(index, depth);
  };

  const handleMasterVolumeChange = (volume: number) => {
    setMasterVolume(volume);
  };

  const handleReverbChange = (wet: number) => {
    setReverbWet(wet);
  };

  const handleReverbDecayChange = (decay: number) => {
    setReverbDecay(decay);
  };

  const handleAutoPannerRateChange = (rate: number) => {
    setAutoPannerRate(rate);
  };

  const handleAutoPannerDepthChange = (depth: number) => {
    setAutoPannerDepth(depth);
  };

  const handleNoiseToggle = (enabled: boolean) => {
    const activeEngine = ensureEngine();

    setNoiseEnabled(enabled);

    if (enabled && isPlaying && noiseGain > 0) {
      activeEngine.startNoise();
    } else {
      activeEngine.stopNoise();
    }
  };

  const handleNoiseTypeChange = (type: NoiseType) => {
    setNoiseType(type);
  };

  const handleNoiseGainChange = (gain: number) => {
    setNoiseGain(gain);
  };

  const handlePercentInputChange = (
    value: string,
    onChange: (nextValue: number) => void
  ) => {
    const parsedValue = parseFloat(value);
    if (Number.isNaN(parsedValue)) return;

    onChange(clampNumber(parsedValue, 0, 100) / 100);
  };

  const activateBinaural = (baseFreq: number, beatFreq: number) => {
    const activePresetName = BINAURAL_PRESETS.find((preset) => preset.freq === beatFreq)?.name ?? 'Custom';
    const safeBaseFrequency = clampNumber(baseFreq, 20, 20000 - beatFreq);

    binauralSnapshotRef.current = oscillators.map((oscillator) => ({ ...oscillator }));
    binauralMasterFXSnapshotRef.current = { ...masterFX };
    setBinauralMode(true, `${safeBaseFrequency}Hz + ${beatFreq}Hz`);

    setReverbWet(0);
    setAutoPannerDepth(0);

    setOscillatorFrequency(0, safeBaseFrequency);
    setOscillatorPan(0, -1);
    setOscillatorGain(0, 0.5);

    setOscillatorFrequency(1, safeBaseFrequency + beatFreq);
    setOscillatorPan(1, 1);
    setOscillatorGain(1, 0.5);

    setOscillatorGain(2, 0);
    setOscillatorGain(3, 0);

    analytics.trackBinauralActivate(activePresetName, beatFreq);
    setStatusMessage(
      `Binaural mode activated: ${activePresetName}. Reverb and panning depth disabled until exit.`
    );
  };

  const exitBinaural = () => {
    const snapshot = binauralSnapshotRef.current;
    const masterFXSnapshot = binauralMasterFXSnapshotRef.current;

    if (snapshot) {
      snapshot.forEach((oscillator, index) => {
        setOscillatorFrequency(index, oscillator.frequency);
        setOscillatorGain(index, oscillator.gain);
        setOscillatorWaveform(index, oscillator.waveform);
        setOscillatorPan(index, oscillator.pan);
        setOscillatorTremoloEnabled(index, oscillator.tremoloEnabled);
        setOscillatorTremoloRate(index, oscillator.tremoloRate);
        setOscillatorTremoloDepth(index, oscillator.tremoloDepth);
      });

      binauralSnapshotRef.current = null;
    }

    if (masterFXSnapshot) {
      setMasterVolume(masterFXSnapshot.masterVolume);
      setReverbWet(masterFXSnapshot.reverbWet);
      setReverbDecay(masterFXSnapshot.reverbDecay);
      setAutoPannerRate(masterFXSnapshot.autoPannerRate);
      setAutoPannerDepth(masterFXSnapshot.autoPannerDepth);
      binauralMasterFXSnapshotRef.current = null;
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

  const handleSharePreset = async () => {
    try {
      const sharedPreset: SharedPresetPayload = {
        version: 1,
        name: presetName.trim() || 'Auralis Shared Preset',
        oscillators,
        masterFX,
        noiseEnabled,
        noiseType,
        noiseGain,
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
    if (!isPlaying) return;

    const activeEngine = ensureEngine();

    await activeEngine.startRecording(recordingMode);
    setIsRecording(true);
    setStatusMessage(`Recording started (${recordingMode} mix).`);
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    try {
      const activeEngine = ensureEngine();
      const blob = await activeEngine.stopRecording();
      const exportBlob = await createExportBlob(blob, exportFormat, exportSampleRate);
      const url = URL.createObjectURL(exportBlob);
      const anchor = document.createElement('a');
      const extension = getRecordingExtension(exportBlob.type);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `auralis-${timestamp}-${recordingMode}.${extension}`;

      anchor.href = url;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);

      setIsRecording(false);
      analytics.trackExport();
      setLastExportName(filename);
      setStatusMessage(
        `Recording exported: ${filename}. ${exportFormat === 'wav' ? `Rendered WAV at ${exportSampleRate} kHz.` : `Browser encoded ${blob.type || extension}.`}`
      );
    } catch (err) {
      console.error('Recording error:', err);
      setIsRecording(false);
      setStatusMessage('Recording export failed.');
    }
  };

  const currentPreset = presets[0];
  const activeStatus = isPlaying ? 'Live' : 'Standby';
  const remainingLabel = timerRemaining !== null ? formatTime(timerRemaining) : '--:--';
  const builtInPresetCount = presets.filter((preset) => preset.id.startsWith('built-in-')).length;
  const filteredPresets = presets.filter((preset) =>
    preset.name.toLowerCase().includes(presetSearch.trim().toLowerCase())
  );

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
              <StatusPill tone={isPlaying ? 'emerald' : 'cyan'}>
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
              <select
                value={recordingMode}
                onChange={(event) => setRecordingMode(event.target.value as RecordingMode)}
                disabled={isRecording}
                aria-label="Recording mix mode"
                className="studio-select rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-400 disabled:opacity-50"
              >
                <option value="wet">Wet Export</option>
                <option value="dry">Dry Export</option>
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
                  disabled={!isPlaying}
                  aria-label={`Start ${recordingMode} recording`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[190px]"
                >
                  <Download size={15} />
                  Record / Export
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  aria-label="Stop recording and export audio"
                  className="inline-flex w-full animate-pulse items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-[190px]"
                >
                  <Square size={14} fill="currentColor" />
                  Stop Rec
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
                {isPlaying ? 'Active' : 'Standby'}
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
                  <p className="font-semibold text-slate-100">{currentPreset?.name ?? 'Manual Session'}</p>
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
                  <Visualizer isActive={isPlaying} />
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
                      <dd className={isPlaying ? 'text-emerald-300' : 'text-cyan-300'}>{activeStatus}</dd>
                    </div>
                  </dl>
                  <p className="mt-6 text-xs leading-5 text-slate-500">
                    Use stereo headphones for binaural modes. Start with low volume, stop if the sound feels uncomfortable, and do not use Auralis as medical treatment or diagnosis.
                  </p>
                </div>
              </div>

              <div className="mt-auto border-t border-white/10 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-100">Brainwave Entrainment</h2>
                  {!isBinauralMode && (
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Base</span>
                      <input
                        type="number"
                        min="20"
                        max="19960"
                        step="0.01"
                        value={Number(binauralBaseFrequency.toFixed(2))}
                        onChange={(event) => {
                          const parsedValue = parseFloat(event.target.value);
                          if (!Number.isNaN(parsedValue)) {
                            setBinauralBaseFrequency(clampNumber(parsedValue, 20, 19960));
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
                      <p className="font-medium text-emerald-300">Binaural Mode Active</p>
                      <p className="text-sm text-slate-400">
                        {binauralPreset ?? 'Oscillators 1 & 2 panned hard L/R with beat frequency'}
                      </p>
                    </div>
                    <button
                      onClick={exitBinaural}
                      className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
                    >
                      Exit Binaural Mode
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-5">
                    {BINAURAL_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => activateBinaural(binauralBaseFrequency, preset.freq)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                        aria-label={`Activate ${preset.name} binaural preset at ${preset.freq} hertz`}
                      >
                        <span className="block font-semibold text-slate-100">{preset.name}</span>
                        <span className="text-xs text-slate-400">{preset.freq} Hz</span>
                      </button>
                    ))}
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
                  disabled={!isPlaying && !isRecording}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={15} />
                  {isRecording ? 'Export Recording' : 'Arm Recorder'}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  Browser-native capture; WAV targets render on export.
                </p>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.25fr]">
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

            <Card className="p-4">
              <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Headphones size={16} className="text-cyan-300" />
                Signal Chain
              </h3>
              <div className="grid grid-cols-4 items-start gap-2 text-center text-xs text-slate-400">
                {[
                  { label: 'Oscillators', icon: AudioWaveform },
                  { label: 'Noise', icon: Waves },
                  { label: 'Effects', icon: Boxes },
                  { label: 'Output', icon: Headphones },
                ].map(({ label, icon: Icon }, index) => (
                  <div key={label} className="relative space-y-2">
                    {index < 3 && (
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
        </GlassPanel>

        <section className="space-y-4 xl:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Oscillator Rack</h2>
              <p className="text-sm text-slate-500">Four tone layers for frequency, gain, pan, waveform, and tremolo.</p>
            </div>
            <span className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300 md:inline-flex">
              4 active layers
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {oscillators.map((oscillator, index) => (
              <OscillatorPanel
                key={index}
                index={index}
                frequency={oscillator.frequency}
                gain={oscillator.gain}
                waveform={oscillator.waveform}
                pan={oscillator.pan}
                tremoloEnabled={oscillator.tremoloEnabled}
                tremoloRate={oscillator.tremoloRate}
                tremoloDepth={oscillator.tremoloDepth}
                onFrequencyChange={(value) => handleFrequencyChange(index, value)}
                onGainChange={(gain) => handleGainChange(index, gain)}
                onWaveformChange={(waveform) => handleWaveformChange(index, waveform)}
                onPanChange={(pan) => handlePanChange(index, pan)}
                onTremoloToggle={(enabled) => handleTremoloToggle(index, enabled)}
                onTremoloRateChange={(rate) => handleTremoloRateChange(index, rate)}
                onTremoloDepthChange={(depth) => handleTremoloDepthChange(index, depth)}
              />
            ))}
          </div>
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

          {filteredPresets.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {filteredPresets.map((preset) => {
                const isBuiltInPreset = preset.id.startsWith('built-in-');

                return (
                  <div
                    key={preset.id}
                    className="group studio-card flex min-h-[106px] items-center justify-between gap-3 rounded-xl p-3"
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
                      </div>
                      <p className="text-xs text-slate-500">{new Date(preset.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => {
                          loadPreset(preset.id);
                          analytics.trackPresetLoad(preset.name, 'local');
                          setShareMessage(`Loaded preset: ${preset.name}`);
                        }}
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
