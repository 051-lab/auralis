'use client';

import React, { useState } from 'react';
import { getAudioEngine } from '@/lib/audioEngine';
import { useAuralisStore } from '@/store/useAuralisStore';
import { OscillatorPanel } from '@/components/OscillatorPanel';
import { Visualizer } from '@/components/Visualizer';
import { linearToLogFrequency } from '@/utils/audioMath';

const BINAURAL_PRESETS = [
  { name: 'Delta Sleep', freq: 2 },
  { name: 'Theta Meditation', freq: 6 },
  { name: 'Alpha Focus', freq: 10 },
  { name: 'Beta Alertness', freq: 20 },
  { name: 'Gamma Insight', freq: 40 },
];

export default function Home() {
  const engine = getAudioEngine();
  const [isPlaying, setIsPlaying] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  const {
    oscillators,
    masterFX,
    isBinauralMode,
    presets,
    setOscillatorFrequency,
    setOscillatorGain,
    setOscillatorWaveform,
    setOscillatorPan,
    setOscillatorTremoloEnabled,
    setOscillatorTremoloRate,
    setOscillatorTremoloDepth,
    setReverbWet,
    setAutoPannerRate,
    setAutoPannerDepth,
    setBinauralMode,
    savePreset,
    loadPreset,
    deletePreset,
  } = useAuralisStore();

  const handleStart = async () => {
    await engine.start();
    setIsPlaying(true);
  };

  const handleStop = () => {
    engine.stop();
    setIsPlaying(false);
  };

  const handleFrequencyChange = (index: number, linearValue: number) => {
    const freq = linearToLogFrequency(linearValue, 20, 20000);
    setOscillatorFrequency(index, freq);
    engine.setFrequency(index, freq);
  };

  const handleGainChange = (index: number, gain: number) => {
    setOscillatorGain(index, gain);
    engine.setGain(index, gain);
  };

  const handleWaveformChange = (index: number, waveform: 'sine' | 'square' | 'sawtooth' | 'triangle') => {
    setOscillatorWaveform(index, waveform);
    engine.setWaveform(index, waveform);
  };

  const handlePanChange = (index: number, pan: number) => {
    setOscillatorPan(index, pan);
    engine.setPan(index, pan);
  };

  const handleTremoloToggle = (index: number, enabled: boolean) => {
    setOscillatorTremoloEnabled(index, enabled);
    engine.setTremoloEnabled(index, enabled);
  };

  const handleTremoloRateChange = (index: number, rate: number) => {
    setOscillatorTremoloRate(index, rate);
    engine.setTremoloRate(index, rate);
  };

  const handleTremoloDepthChange = (index: number, depth: number) => {
    setOscillatorTremoloDepth(index, depth);
    engine.setTremoloDepth(index, depth);
  };

  const handleReverbChange = (wet: number) => {
    setReverbWet(wet);
    engine.setReverbWet(wet);
  };

  const handleAutoPannerRateChange = (rate: number) => {
    setAutoPannerRate(rate);
    engine.setAutoPannerRate(rate);
  };

  const handleAutoPannerDepthChange = (depth: number) => {
    setAutoPannerDepth(depth);
    engine.setAutoPannerDepth(depth);
  };

  const activateBinaural = (baseFreq: number, beatFreq: number) => {
    setBinauralMode(true, `${baseFreq}Hz + ${beatFreq}Hz`);
    
    // Set osc 1: base freq, hard left
    const freq1 = baseFreq;
    setOscillatorFrequency(0, freq1);
    setOscillatorPan(0, -1);
    setOscillatorGain(0, 0.5);
    engine.setFrequency(0, freq1);
    engine.setPan(0, -1);
    engine.setGain(0, 0.5);

    // Set osc 2: base + beat, hard right
    const freq2 = baseFreq + beatFreq;
    setOscillatorFrequency(1, freq2);
    setOscillatorPan(1, 1);
    setOscillatorGain(1, 0.5);
    engine.setFrequency(1, freq2);
    engine.setPan(1, 1);
    engine.setGain(1, 0.5);

    // Mute osc 3 & 4
    setOscillatorGain(2, 0);
    setOscillatorGain(3, 0);
    engine.setGain(2, 0);
    engine.setGain(3, 0);
  };

  const exitBinaural = () => {
    setBinauralMode(false);
    // Restore gains
    oscillators.forEach((osc, i) => {
      engine.setGain(i, osc.gain);
      engine.setPan(i, osc.pan);
    });
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName('');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Auralis
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Somatic Frequency Generator & Binaural Entrainment System
          </p>
        </header>

        {/* Visualizer */}
        <Visualizer isActive={isPlaying} />

        {/* Master Controls */}
        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-4">
              <button
                onClick={handleStart}
                disabled={isPlaying}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25"
              >
                ▶ Start Audio
              </button>
              <button
                onClick={handleStop}
                disabled={!isPlaying}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl font-semibold hover:from-red-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/25"
              >
                ■ Stop
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-slate-400">{isPlaying ? 'Active' : 'Standby'}</span>
            </div>
          </div>
        </section>

        {/* Master FX Section */}
        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Master Effects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex justify-between">
                <span>Reverb Wet/Dry</span>
                <span>{Math.round(masterFX.reverbWet * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterFX.reverbWet}
                onChange={(e) => handleReverbChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex justify-between">
                <span>Auto-Panner Speed</span>
                <span>{masterFX.autoPannerRate.toFixed(2)} Hz</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.01"
                value={masterFX.autoPannerRate}
                onChange={(e) => handleAutoPannerRateChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex justify-between">
                <span>Auto-Panner Depth</span>
                <span>{Math.round(masterFX.autoPannerDepth * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterFX.autoPannerDepth}
                onChange={(e) => handleAutoPannerDepthChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </section>

        {/* Binaural Presets */}
        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Brainwave Entrainment</h2>
          {isBinauralMode ? (
            <div className="flex items-center justify-between p-4 bg-emerald-900/30 rounded-xl border border-emerald-700/50">
              <div>
                <p className="text-emerald-400 font-medium">Binaural Mode Active</p>
                <p className="text-sm text-slate-400">Oscillators 1 & 2 panned hard L/R with beat frequency</p>
              </div>
              <button
                onClick={exitBinaural}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
              >
                Exit Binaural Mode
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {BINAURAL_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => activateBinaural(400, preset.freq)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-600 hover:border-slate-500"
                >
                  {preset.name} ({preset.freq}Hz)
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Oscillator Panels Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {oscillators.map((osc, index) => (
            <OscillatorPanel
              key={index}
              index={index}
              frequency={osc.frequency}
              gain={osc.gain}
              waveform={osc.waveform}
              pan={osc.pan}
              tremoloEnabled={osc.tremoloEnabled}
              tremoloRate={osc.tremoloRate}
              tremoloDepth={osc.tremoloDepth}
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

        {/* Presets Section */}
        <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Presets</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-cyan-500 flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Save Preset
            </button>
          </div>
          {presets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-200">{preset.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(preset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadPreset(preset.id)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No presets saved yet. Create your perfect soundscape and save it!</p>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-slate-600 text-xs py-8">
          <p>Auralis v1.0 • Built with Next.js, Tone.js & Zustand</p>
        </footer>
      </div>
    </main>
  );
}
