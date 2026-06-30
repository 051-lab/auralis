'use client';

import React from 'react';
import { formatFrequency, logFrequencyToLinear } from '@/utils/audioMath';
import { clamp } from '@/utils/math';
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

const numberInputClass =
  'h-8 w-24 rounded-lg border border-slate-700 bg-slate-950/75 px-2 py-1 text-right text-xs text-slate-100 outline-none transition-colors focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50';

const COLORS = [
  { primary: 'from-cyan-500 to-blue-500', accent: 'text-cyan-300', border: 'border-cyan-400/35', glow: 'shadow-cyan-500/20', top: 'from-cyan-400/60' },
  { primary: 'from-violet-500 to-fuchsia-500', accent: 'text-violet-300', border: 'border-violet-400/35', glow: 'shadow-violet-500/20', top: 'from-violet-400/60' },
  { primary: 'from-emerald-500 to-teal-500', accent: 'text-emerald-300', border: 'border-emerald-400/35', glow: 'shadow-emerald-500/20', top: 'from-emerald-400/60' },
  { primary: 'from-amber-500 to-orange-500', accent: 'text-amber-300', border: 'border-amber-400/35', glow: 'shadow-amber-500/20', top: 'from-amber-400/60' },
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
  const color = COLORS[index];
  const linearFreq = logFrequencyToLinear(frequency, 20, 20000);
  const gainDb = gain <= 0 ? '-∞ dB' : `${(20 * Math.log10(gain)).toFixed(1)} dB`;
  const panLabel = pan === 0 ? 'C' : pan < 0 ? `L ${Math.abs(Math.round(pan * 100))}` : `R ${Math.round(pan * 100)}`;

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
    <div className={`studio-card relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border ${color.border} p-3.5 shadow-lg ${color.glow}`}>
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${color.top} via-white/30 to-transparent`} />
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${color.accent}`}>
            Oscillator {index + 1}
          </p>
          <p className="mt-1 font-mono text-[13px] text-slate-400">{formatFrequency(frequency)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {WAVEFORMS.map((option) => (
            <button
              key={option.value}
              onClick={() => onWaveformChange(option.value)}
              className={`grid h-7 min-w-8 place-items-center rounded-lg px-2 text-[11px] font-semibold transition-all ${
                waveform === option.value
                  ? `bg-gradient-to-r ${color.primary} text-white shadow-[0_8px_22px_rgba(34,211,238,0.12)]`
                  : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
              }`}
              title={option.title}
              aria-label={`Set oscillator ${index + 1} waveform to ${option.title}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>Frequency</span>
          <input
            type="number"
            min="20"
            max="20000"
            step="0.01"
            value={Number(frequency.toFixed(2))}
            onChange={(e) => handleFrequencyNumberChange(e.target.value)}
            className={numberInputClass}
            aria-label={`Oscillator ${index + 1} frequency in hertz`}
          />
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.0001"
          value={linearFreq}
          onChange={(e) => onFrequencyChange(parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
          aria-label={`Oscillator ${index + 1} frequency slider`}
        />
      </div>

      <div className="mb-3 space-y-2">
        <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>Gain</span>
          <div className="flex items-center gap-2">
            <span className={`font-mono ${color.accent}`}>{gainDb}</span>
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
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
          aria-label={`Oscillator ${index + 1} gain slider`}
        />
      </div>

      <div className="mb-3 space-y-2">
        <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>Pan</span>
          <span className={`font-mono ${color.accent}`}>{panLabel}</span>
        </label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={pan}
          onChange={(e) => onPanChange(parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
          aria-label={`Oscillator ${index + 1} pan slider`}
        />
      </div>

      <div className="mt-auto border-t border-white/10 pt-3.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-400">Tremolo</span>
          <button
            onClick={() => onTremoloToggle(!tremoloEnabled)}
            aria-label={`${tremoloEnabled ? 'Disable' : 'Enable'} oscillator ${index + 1} tremolo`}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              tremoloEnabled
                ? `bg-gradient-to-r ${color.primary} text-white shadow-md`
                : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'
            }`}
          >
            {tremoloEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <label className="space-y-2 text-xs text-slate-400">
            <span className="flex items-center justify-between">
              Rate <span className={color.accent}>{tremoloRate.toFixed(1)} Hz</span>
            </span>
            <input
              type="range"
              min="0.1"
              max="30"
              step="0.1"
              value={tremoloRate}
              onChange={(e) => onTremoloRateChange(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
              disabled={!tremoloEnabled}
              aria-label={`Oscillator ${index + 1} tremolo speed slider`}
            />
          </label>
          <label className="space-y-2 text-xs text-slate-400">
            <span className="flex items-center justify-between">
              Depth <span className={color.accent}>{Number((tremoloDepth * 100).toFixed(0))}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tremoloDepth}
              onChange={(e) => onTremoloDepthChange(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
              disabled={!tremoloEnabled}
              aria-label={`Oscillator ${index + 1} tremolo depth slider`}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
