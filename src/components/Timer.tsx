'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { getAudioEngine } from '@/lib/audioEngine';
import { analytics } from '@/lib/analytics';

type AudioEngineInstance = ReturnType<typeof getAudioEngine>;

interface TimerProps {
  duration: number | null;
  remaining: number | null;
  isPlaying: boolean;
  onSetDuration: (duration: number | null) => void;
  onSetRemaining: (remaining: number | null) => void;
  onStop: () => void;
}

const TIMER_OPTIONS = [
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
  onStop,
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const engineRef = useRef<AudioEngineInstance | null>(null);

  useEffect(() => {
    engineRef.current = getAudioEngine();
  }, []);

  const handleTimerComplete = useCallback(async () => {
    if (duration) {
      analytics.trackTimerComplete(duration);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const engine = engineRef.current ?? getAudioEngine();

    await engine.fadeOutAndStop(10);
    onSetRemaining(null);
    onSetDuration(null);
    analytics.trackAudioStop('timer_complete');
    onStop();
  }, [duration, onSetDuration, onSetRemaining, onStop]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (duration !== null && remaining !== null && remaining > 0 && isPlaying) {
      timerRef.current = setInterval(() => {
        onSetRemaining(remaining - 1);
      }, 1000);
    } else if (remaining === 0 && duration !== null) {
      // Timer finished - trigger auto-fade
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [duration, remaining, isPlaying, onSetRemaining, handleTimerComplete]);

  const handleSetDuration = (seconds: number) => {
    onSetDuration(seconds);
    onSetRemaining(seconds);
  };

  const handleClearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onSetDuration(null);
    onSetRemaining(null);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-cyan-400 mb-2">
              {formatTime(remaining || 0)}
            </div>
            <div className="text-sm text-slate-400">remaining</div>
          </div>
          
          {/* Progress bar */}
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
