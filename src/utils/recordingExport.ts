import type { RecordingMode } from '@/lib/audioEngine';

export function getRecordingModeLabel(mode: RecordingMode): string {
  return mode === 'dry' ? 'Dry Export (limited)' : 'Wet Export (limited)';
}

export function getRecordingModeDescription(mode: RecordingMode): string {
  if (mode === 'dry') {
    return 'Dry export skips reverb and auto-panner, then records through a safety limiter.';
  }

  return 'Wet export includes reverb and auto-panner, then records through the output safety limiter.';
}
