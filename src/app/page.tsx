'use client';

import React, { useEffect, useRef, useState } from 'react';
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

function getRecordingExtension(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
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
  const [binauralBaseFrequency, setBinauralBaseFrequency] = useState(400);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
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
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const extension = getRecordingExtension(blob.type);
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
      setStatusMessage(`Recording exported: ${filename}`);
    } catch (err) {
      console.error('Recording error:', err);
      setIsRecording(false);
      setStatusMessage('Recording export failed.');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Auralis
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Somatic Frequency Generator & Binaural Entrainment System
          </p>
        </header>

        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleStart}
                  disabled={isPlaying}
                  aria-label="Start audio playback"
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25"
                >
                  ▶ Start Audio
                </button>

                <button
                  onClick={handleStop}
                  disabled={!isPlaying}
                  aria-label="Stop audio playback"
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl font-semibold hover:from-red-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/25"
                >
                  ■ Stop
                </button>

                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    disabled={!isPlaying}
                    aria-label={`Start ${recordingMode} recording`}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/25"
                  >
                    ● Record
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    aria-label="Stop recording and export audio"
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all shadow-lg shadow-red-600/25 animate-pulse"
                  >
                    ■ Stop Rec
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Record</span>
                  <select
                    value={recordingMode}
                    onChange={(event) => setRecordingMode(event.target.value as RecordingMode)}
                    disabled={isRecording}
                    aria-label="Recording mix mode"
                    className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 disabled:opacity-50"
                  >
                    <option value="wet">Wet</option>
                    <option value="dry">Dry</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isPlaying ? 'bg-green-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-slate-400">Audio {isPlaying ? 'Active' : 'Standby'}</span>
                </div>

                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400">REC {recordingMode.toUpperCase()}</span>
                  </div>
                )}

                {timerRemaining !== null && (
                  <div className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-cyan-300 font-mono">
                    {formatTime(timerRemaining)}
                  </div>
                )}
              </div>
            </div>

            {statusMessage && (
              <p
                className="text-sm text-cyan-300 bg-cyan-950/30 border border-cyan-800/50 rounded-lg px-4 py-2"
                aria-live="polite"
              >
                {statusMessage}
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] gap-4">
              <p className="text-xs leading-5 text-slate-500">
                Use stereo headphones for binaural modes. Start with low volume, stop if the sound
                feels uncomfortable, and do not use Auralis as medical treatment or diagnosis.
              </p>

              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center justify-between gap-3">
                  <span>Master Volume</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={percentInputValue(masterFX.masterVolume)}
                      onChange={(event) =>
                        handlePercentInputChange(event.target.value, handleMasterVolumeChange)
                      }
                      className={numberInputClass}
                      aria-label="Master volume percent"
                    />
                    <span>%</span>
                  </div>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterFX.masterVolume}
                  onChange={(event) => handleMasterVolumeChange(parseFloat(event.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  aria-label="Master volume slider"
                />
              </div>
            </div>
          </div>
        </section>

        <Visualizer isActive={isPlaying} />

        <Timer
          duration={timerDuration}
          remaining={timerRemaining}
          isPlaying={isPlaying}
          onSetDuration={setTimerDuration}
          onSetRemaining={setTimerRemaining}
          onComplete={handleTimerComplete}
        />

        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">Noise Layer</h2>
              <p className="text-sm text-slate-500">
                Add a soft broadband texture beneath the oscillator tones.
              </p>
            </div>

            <button
              onClick={() => handleNoiseToggle(!noiseEnabled)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                noiseEnabled
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {noiseEnabled ? 'Noise Enabled' : 'Enable Noise'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Noise Type</label>
              <select
                value={noiseType}
                onChange={(event) => handleNoiseTypeChange(event.target.value as NoiseType)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
              >
                {NOISE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-slate-400 flex items-center justify-between gap-3">
                <label htmlFor="noise-volume-input">Noise Volume</label>
                <div className="flex items-center gap-2">
                  <input
                    id="noise-volume-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={percentInputValue(noiseGain)}
                    onInput={(event) =>
                      handlePercentInputChange(event.currentTarget.value, handleNoiseGainChange)
                    }
                    onChange={(event) =>
                      handlePercentInputChange(event.target.value, handleNoiseGainChange)
                    }
                    className={numberInputClass}
                    aria-label="Noise volume percent"
                  />
                  <span>%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={noiseGain}
                onChange={(event) => handleNoiseGainChange(parseFloat(event.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                aria-label="Noise volume slider"
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Master Effects</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center justify-between gap-3">
                <span>Reverb Wet/Dry</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={percentInputValue(masterFX.reverbWet)}
                    onChange={(event) =>
                      handlePercentInputChange(event.target.value, handleReverbChange)
                    }
                    className={numberInputClass}
                    aria-label="Reverb wet dry percent"
                  />
                  <span>%</span>
                </div>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterFX.reverbWet}
                onChange={(event) => handleReverbChange(parseFloat(event.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                aria-label="Reverb wet dry slider"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center justify-between gap-3">
                <span>Reverb Decay</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.2"
                    max="12"
                    step="0.1"
                    value={Number(masterFX.reverbDecay.toFixed(1))}
                    onChange={(event) => {
                      const parsedValue = parseFloat(event.target.value);
                      if (!Number.isNaN(parsedValue)) {
                        handleReverbDecayChange(clampNumber(parsedValue, 0.2, 12));
                      }
                    }}
                    className={numberInputClass}
                    aria-label="Reverb decay in seconds"
                  />
                  <span>s</span>
                </div>
              </label>
              <input
                type="range"
                min="0.2"
                max="12"
                step="0.1"
                value={masterFX.reverbDecay}
                onChange={(event) => handleReverbDecayChange(parseFloat(event.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                aria-label="Reverb decay slider"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center justify-between gap-3">
                <span>Auto-Panner Speed</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.01"
                    value={Number(masterFX.autoPannerRate.toFixed(2))}
                    onChange={(event) => {
                      const parsedValue = parseFloat(event.target.value);
                      if (!Number.isNaN(parsedValue)) {
                        handleAutoPannerRateChange(clampNumber(parsedValue, 0, 20));
                      }
                    }}
                    className={numberInputClass}
                    aria-label="Auto-panner speed in hertz"
                  />
                  <span>Hz</span>
                </div>
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="0.01"
                value={masterFX.autoPannerRate}
                onChange={(event) => handleAutoPannerRateChange(parseFloat(event.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                aria-label="Auto-panner speed slider"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center justify-between gap-3">
                <span>Auto-Panner Depth</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={percentInputValue(masterFX.autoPannerDepth)}
                    onChange={(event) =>
                      handlePercentInputChange(event.target.value, handleAutoPannerDepthChange)
                    }
                    className={numberInputClass}
                    aria-label="Auto-panner depth percent"
                  />
                  <span>%</span>
                </div>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterFX.autoPannerDepth}
                onChange={(event) => handleAutoPannerDepthChange(parseFloat(event.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                aria-label="Auto-panner depth slider"
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Brainwave Entrainment</h2>

          {isBinauralMode ? (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-emerald-900/30 rounded-xl border border-emerald-700/50">
              <div>
                <p className="text-emerald-400 font-medium">Binaural Mode Active</p>
                <p className="text-sm text-slate-400">
                  {binauralPreset ?? 'Oscillators 1 & 2 panned hard L/R with beat frequency'}
                </p>
              </div>

              <button
                onClick={exitBinaural}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
              >
                Exit Binaural Mode
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <span>Base Frequency</span>
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
              </div>

              <div className="flex flex-wrap gap-3">
                {BINAURAL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => activateBinaural(binauralBaseFrequency, preset.freq)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-600 hover:border-slate-500"
                    aria-label={`Activate ${preset.name} binaural preset at ${preset.freq} hertz`}
                  >
                    {preset.name} ({preset.freq}Hz)
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </section>

        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Presets</h2>

          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Preset name..."
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-cyan-500 flex-1 min-w-[200px]"
              onKeyDown={(event) => event.key === 'Enter' && handleSavePreset()}
            />

            <div className="flex gap-3">
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                aria-label="Save current settings as preset"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                Save Preset
              </button>

              <button
                onClick={handleSharePreset}
                aria-label="Copy share link for current settings"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
              >
                Share
              </button>
            </div>
          </div>

          {shareMessage && (
            <p
              className="mb-6 text-sm text-cyan-300 bg-cyan-950/30 border border-cyan-800/50 rounded-lg px-4 py-2"
              aria-live="polite"
            >
              {shareMessage}
            </p>
          )}

          {presets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {presets.map((preset) => {
                const isBuiltInPreset = preset.id.startsWith('built-in-');

                return (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-200">{preset.name}</p>
                        {isBuiltInPreset && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-800/50 text-[10px] uppercase tracking-wide text-cyan-300">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(preset.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          loadPreset(preset.id);
                          analytics.trackPresetLoad(preset.name, 'local');
                          setShareMessage(`Loaded preset: ${preset.name}`);
                        }}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors"
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
                          className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded text-xs font-medium transition-colors"
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
            <p className="text-slate-500 text-sm">
              No presets saved yet. Create your perfect soundscape and save it!
            </p>
          )}
        </section>

        <footer className="text-center text-slate-600 text-xs py-8">
          <p>Auralis v{packageJson.version} • Built with Next.js, Tone.js & Zustand</p>
        </footer>
      </div>
    </main>
  );
}
