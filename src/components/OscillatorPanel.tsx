'use client';

import React, { useState } from 'react';
import { formatFrequency, logFrequencyToLinear } from '@/utils/audioMath';
import type { WaveformType } from '@/lib/audioEngine';

interface OscillatorPanelProps {
  index: number;
  frequency: number;
  gain: number;
  waveform: WaveformType;
  pan: number;
  tremoloEnabled: boolean;
  tremoloRate: number;
  tremoloDepth: number;
  onFrequencyChange: (linearValue: number) => void;
  onGainChange: (gain: number) => void;
  onWaveformChange: (waveform: WaveformType) => void;
  onPanChange: (pan: number) => void;
  onTremoloToggle: (enabled: boolean) => void;
  onTremoloRateChange: (rate: number) => void;
  onTremoloDepthChange: (depth: number) => void;
}

const WAVEFORMS: WaveformType[] = ['sine', 'square', 'sawtooth', 'triangle'];

const COLORS = [
  { primary: 'from-cyan-500 to-blue-500', accent: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
  { primary: 'from-purple-500 to-pink-500', accent: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
  { primary: 'from-emerald-500 to-teal-500', accent: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
  { primary: 'from-amber-500 to-orange-500', accent: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
];

export const OscillatorPanel: React.FC<OscillatorPanelProps> = ({
  index,
  frequency,
  gain,
  waveform,
  pan,
  tremoloEnabled,
  tremoloRate,
  tremoloDepth,
  onFrequencyChange,
  onGainChange,
  onWaveformChange,
  onPanChange,
  onTremoloToggle,
  onTremoloRateChange,
  onTremoloDepthChange,
}) => {
  const [showTremolo, setShowTremolo] = useState(false);
  const color = COLORS[index];
  const linearFreq = logFrequencyToLinear(frequency, 20, 20000);

  return (
    <div className={`glass rounded-2xl p-5 border ${color.border} shadow-lg ${color.glow} transition-all hover:shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${color.accent}`}>Oscillator {index + 1}</h3>
        <div className="flex gap-1">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              onClick={() => onWaveformChange(w)}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                waveform === w
                  ? `bg-gradient-to-r ${color.primary} text-white shadow-md`
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
              title={w}
            >
              {w.slice(0, 1).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency Slider */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-slate-400 flex justify-between">
          <span>Frequency</span>
          <span className={color.accent}>{formatFrequency(frequency)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.0001"
          value={linearFreq}
          onChange={(e) => onFrequencyChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Gain Slider */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-slate-400 flex justify-between">
          <span>Gain</span>
          <span>{Math.round(gain * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={gain}
          onChange={(e) => onGainChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Pan Slider */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-slate-400 flex justify-between">
          <span>Pan</span>
          <span>{pan < 0 ? `L${Math.abs(Math.round(pan * 100))}` : pan > 0 ? `R${Math.round(pan * 100)}` : 'C'}</span>
        </label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={pan}
          onChange={(e) => onPanChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Tremolo Toggle */}
      <button
        onClick={() => setShowTremolo(!showTremolo)}
        className={`w-full py-2 rounded-lg text-xs font-medium transition-all mb-3 ${
          tremoloEnabled
            ? `bg-gradient-to-r ${color.primary} text-white`
            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
        }`}
      >
        {tremoloEnabled ? '✓ Tremolo Active' : '○ Tremolo'}
      </button>

      {/* Tremolo Controls */}
      {showTremolo && (
        <div className="space-y-3 pt-3 border-t border-slate-700/50">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 flex justify-between">
              <span>Speed</span>
              <span>{tremoloRate.toFixed(1)} Hz</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.1"
              value={tremoloRate}
              onChange={(e) => onTremoloRateChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              disabled={!tremoloEnabled}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400 flex justify-between">
              <span>Depth</span>
              <span>{Math.round(tremoloDepth * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tremoloDepth}
              onChange={(e) => onTremoloDepthChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              disabled={!tremoloEnabled}
            />
          </div>
          <button
            onClick={() => onTremoloToggle(!tremoloEnabled)}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
              tremoloEnabled
                ? 'bg-red-900/50 text-red-400 hover:bg-red-800/50'
                : `bg-gradient-to-r ${color.primary} text-white`
            }`}
          >
            {tremoloEnabled ? 'Disable Tremolo' : 'Enable Tremolo'}
          </button>
        </div>
      )}
    </div>
  );
};
