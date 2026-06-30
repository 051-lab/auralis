'use client';

import React, { useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics';

interface TimerProps {
  duration: number | null;
  remaining: number | null;
  isPlaying: boolean;
  onSetDuration: (duration: number | null) => void;
  onSetRemaining: (remaining: number | null) => void;
  onComplete: () => Promise<void>;
}

const TIMER_OPTIONS = [
  ...(process.env.NODE_ENV === 'development' ? [{ label: '10s', value: 10 }] : []),
  { label: '15m', value: 15 * 60 },
  { label: '30m', value: 30 * 60 },
  { label: '60m', value: 60 * 60 },
];

export const Timer: React.FC<TimerProps> = ({
  duration,
  remaining,
  isPlaying,
  onSetDuration,
  onSetRemaining,
  onComplete,
}) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef<number | null>(remaining);
  const durationRef = useRef<number | null>(duration);
  const onCompleteRef = useRef(onComplete);
  const completingRef = useRef(false);

  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (duration === null || remainingRef.current === null || remainingRef.current <= 0 || !isPlaying) {
      return;
    }

    timerRef.current = setInterval(() => {
      const currentRemaining = remainingRef.current;
      if (currentRemaining === null) return;

      const nextRemaining = Math.max(0, currentRemaining - 1);
      remainingRef.current = nextRemaining;
      onSetRemaining(nextRemaining);

      if (nextRemaining === 0 && !completingRef.current) {
        completingRef.current = true;

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const activeDuration = durationRef.current;
        if (activeDuration) {
          analytics.trackTimerComplete(activeDuration);
        }

        onCompleteRef.current().finally(() => {
          completingRef.current = false;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, isPlaying, onSetRemaining]);

  const handleSetDuration = (seconds: number) => {
    completingRef.current = false;
    onSetDuration(seconds);
    onSetRemaining(seconds);
  };

  const handleClearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    completingRef.current = false;
    onSetDuration(null);
    onSetRemaining(null);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration && remaining ? (remaining / duration) * 100 : 0;

  return (
    <div className="studio-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg text-cyan-300">⌛</span>
          <h2 className="text-sm font-semibold text-slate-100">Session Timer</h2>
        </div>
        {duration && (
          <span className={isPlaying ? 'text-xs text-emerald-300' : 'text-xs text-cyan-300'}>
            {isPlaying ? 'Running' : 'Queued'}
          </span>
        )}
      </div>

      {!duration ? (
        <div className="grid grid-cols-2 gap-3">
          {TIMER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSetDuration(option.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
              aria-label={`Set timer for ${option.label}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center" aria-live="polite">
            <div className="mb-1 font-mono text-4xl font-semibold text-cyan-300">
              {formatTime(remaining || 0)}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">remaining</div>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleClearTimer}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              aria-label="Clear session timer"
            >
              Clear Timer
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
        {duration && !isPlaying
          ? 'Timer is queued and will begin counting down when audio starts'
          : 'When timer ends, audio will fade out smoothly over 10 seconds'}
      </p>
    </div>
  );
};
