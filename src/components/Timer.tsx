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
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <h2 className="text-lg font-semibold mb-4 text-slate-200">Session Timer</h2>

      {!duration ? (
        <div className="flex flex-wrap gap-3">
          {TIMER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSetDuration(option.value)}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors border border-slate-600 hover:border-slate-500"
              aria-label={`Set timer for ${option.label}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center" aria-live="polite">
            <div className="text-4xl font-mono font-bold text-cyan-400 mb-2">
              {formatTime(remaining || 0)}
            </div>
            <div className="text-sm text-slate-400">remaining</div>
          </div>

          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleClearTimer}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
              aria-label="Clear session timer"
            >
              Clear Timer
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500 text-center">
        {duration && !isPlaying
          ? 'Timer is queued and will begin counting down when audio starts'
          : 'When timer ends, audio will fade out smoothly over 10 seconds'}
      </p>
    </div>
  );
};
