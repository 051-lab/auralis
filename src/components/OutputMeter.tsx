'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/lib/audioEngine';
import {
  METER_FLOOR_DB,
  createSilentOutputMeter,
  formatDb,
} from '@/utils/audioMeter';
import type { OutputMeterReading } from '@/utils/audioMeter';
import { cx } from '@/components/ui';

interface OutputMeterProps {
  engine: AudioEngine | null;
  isPlaying: boolean;
  className?: string;
}

const PEAK_HOLD_MS = 1400;
const METER_UPDATE_MS = 120;

function levelToPercent(db: number): number {
  if (!Number.isFinite(db)) return 0;

  return Math.max(0, Math.min(100, ((db - METER_FLOOR_DB) / Math.abs(METER_FLOOR_DB)) * 100));
}

function getMeterStatus(meter: OutputMeterReading): {
  label: string;
  className: string;
  barClassName: string;
} {
  if (meter.inputClipRisk) {
    return {
      label: 'Input Clip Risk',
      className: 'border-red-400/30 bg-red-400/10 text-red-300',
      barClassName: 'from-amber-400 via-orange-400 to-red-400',
    };
  }

  if (meter.limiterActive) {
    return {
      label: 'Limiter Active',
      className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
      barClassName: 'from-cyan-400 via-violet-400 to-amber-300',
    };
  }

  if (meter.isHot) {
    return {
      label: 'Output Hot',
      className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
      barClassName: 'from-cyan-400 via-violet-400 to-amber-300',
    };
  }

  return {
    label: 'Safe',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    barClassName: 'from-cyan-400 via-blue-400 to-emerald-300',
  };
}

export function OutputMeter({ engine, isPlaying, className }: OutputMeterProps) {
  const [meter, setMeter] = useState<OutputMeterReading>(() => createSilentOutputMeter());
  const [peakHoldDb, setPeakHoldDb] = useState(METER_FLOOR_DB);
  const peakHoldTimeRef = useRef(0);

  useEffect(() => {
    if (!engine || !isPlaying) {
      peakHoldTimeRef.current = 0;
      return;
    }

    const updateMeter = () => {
      const nextMeter = engine.getOutputMeter();
      const now = performance.now();

      setMeter(nextMeter);
      setPeakHoldDb((currentPeakHoldDb) => {
        if (nextMeter.peakDb >= currentPeakHoldDb || now - peakHoldTimeRef.current > PEAK_HOLD_MS) {
          peakHoldTimeRef.current = now;
          return nextMeter.peakDb;
        }

        return currentPeakHoldDb;
      });
    };

    updateMeter();
    const intervalId = window.setInterval(updateMeter, METER_UPDATE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [engine, isPlaying]);

  const displayedMeter = engine && isPlaying ? meter : createSilentOutputMeter();
  const displayedPeakHoldDb = engine && isPlaying ? peakHoldDb : METER_FLOOR_DB;
  const status = getMeterStatus(displayedMeter);
  const rmsPercent = levelToPercent(displayedMeter.rmsDb);
  const peakPercent = levelToPercent(displayedMeter.peakDb);
  const peakHoldPercent = levelToPercent(displayedPeakHoldDb);

  return (
    <div
      className={cx(
        'min-w-[260px] rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        className
      )}
      aria-label="Output level meter"
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-medium text-slate-300">Output</span>
        <span className={cx('rounded-full border px-2 py-0.5 font-medium', status.className)}>
          {status.label}
        </span>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-400">
        <span>Input {formatDb(displayedMeter.inputPeakDb)}</span>
        <span className="text-right">Output {formatDb(displayedMeter.outputPeakDb)}</span>
        <span>RMS {formatDb(displayedMeter.rmsDb)}</span>
        <span className="text-right">GR {formatDb(displayedMeter.limiterReductionDb)}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800/90">
        <div
          className={cx('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r opacity-50', status.barClassName)}
          style={{ width: `${rmsPercent}%` }}
        />
        <div
          className={cx('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-[0_0_18px_rgba(34,211,238,0.35)]', status.barClassName)}
          style={{ width: `${peakPercent}%` }}
        />
        <span
          className="absolute top-0 h-full w-px bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.7)]"
          style={{ left: `${peakHoldPercent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
