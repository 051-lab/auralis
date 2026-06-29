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

const WAVEFORMS: Array<{ value: WaveformType; label: string; title: string }> = [
  { value: 'sine', label: 'Si', title: 'Sine' },
  { value: 'square', label: 'Sq', title: 'Square' },
  { value: 'sawtooth', label: 'Sa', title: 'Sawtooth' },
  { value: 'triangle', label: 'Tr', title: 'Triangle' },
];

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const numberInputClass =
  'w-24 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-right text-xs text-slate-100 outline-none transition-colors focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50';

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

  const handleFrequencyNumberChange = (value: string) => {
    const parsedValue = parseFloat(value);
    if (Number.isNaN(parsedValue)) return;

    onFrequencyChange(logFrequencyToLinear(clamp(parsedValue, 20, 20000), 20, 20000));
  };

  const handlePercentChange = (
    value: string,
    onChange: (nextValue: number) => void
  ) => {
    const parsedValue = parseFloat(value);
    if (Number.isNaN(parsedValue)) return;

    onChange(clamp(parsedValue, 0, 100) / 100);
  };

  return (
    <div className={`glass rounded-2xl p-5 border ${color.border} shadow-lg ${color.glow} transition-all hover:shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${color.accent}`}>Oscillator {index + 1}</h3>
        <div className="flex gap-1">
          {WAVEFORMS.map((option) => (
            <button
              key={option.value}
              onClick={() => onWaveformChange(option.value)}
              className={`min-w-8 p-1.5 rounded-lg text-xs font-medium transition-all ${
                waveform === option.value
                  ? `bg-gradient-to-r ${color.primary} text-white shadow-md`
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
              title={option.title}
              aria-label={`Set oscillator ${index + 1} waveform to ${option.title}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency Slider */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-slate-400 flex items-center justify-between gap-3">
          <span>Frequency</span>
          <span className={`font-mono ${color.accent}`}>{formatFrequency(frequency)}</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="20"
            max="20000"
            step="0.01"
            value={Number(frequency.toFixed(2))}
            onChange={(e) => handleFrequencyNumberChange(e.target.value)}
            className="w-28 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-right text-xs text-slate-100 outline-none transition-colors focus:border-cyan-500"
            aria-label={`Oscillator ${index + 1} frequency in hertz`}
          />
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Hz</span>
        </div>
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
        <label className="text-xs text-slate-400 flex items-center justify-between gap-3">
          <span>Gain</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={Number((gain * 100).toFixed(0))}
              onChange={(e) => handlePercentChange(e.target.value, onGainChange)}
              className={numberInputClass}
              aria-label={`Oscillator ${index + 1} gain percent`}
            />
            <span>%</span>
          </div>
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
        <label className="text-xs text-slate-400 flex items-center justify-between gap-3">
          <span>Pan</span>
          <input
            type="number"
            min="-1"
            max="1"
            step="0.01"
            value={Number(pan.toFixed(2))}
            onChange={(e) => {
              const parsedValue = parseFloat(e.target.value);
              if (!Number.isNaN(parsedValue)) {
                onPanChange(clamp(parsedValue, -1, 1));
              }
            }}
            className={numberInputClass}
            aria-label={`Oscillator ${index + 1} pan`}
          />
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
            <label className="text-xs text-slate-400 flex items-center justify-between gap-3">
              <span>Speed</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.1"
                  value={Number(tremoloRate.toFixed(1))}
                  onChange={(e) => {
                    const parsedValue = parseFloat(e.target.value);
                    if (!Number.isNaN(parsedValue)) {
                      onTremoloRateChange(clamp(parsedValue, 0.5, 10));
                    }
                  }}
                  className={numberInputClass}
                  disabled={!tremoloEnabled}
                  aria-label={`Oscillator ${index + 1} tremolo speed in hertz`}
                />
                <span>Hz</span>
              </div>
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
            <label className="text-xs text-slate-400 flex items-center justify-between gap-3">
              <span>Depth</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Number((tremoloDepth * 100).toFixed(0))}
                  onChange={(e) => handlePercentChange(e.target.value, onTremoloDepthChange)}
                  className={numberInputClass}
                  disabled={!tremoloEnabled}
                  aria-label={`Oscillator ${index + 1} tremolo depth percent`}
                />
                <span>%</span>
              </div>
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
