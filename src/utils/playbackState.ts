export type PlaybackStatus = 'Live' | 'Fading' | 'Standby';

export function getPlaybackStatus(isPlaying: boolean, isFadingOut: boolean): PlaybackStatus {
  if (isFadingOut) return 'Fading';
  if (isPlaying) return 'Live';

  return 'Standby';
}

export function isAudiblePlayback(isPlaying: boolean, isFadingOut: boolean): boolean {
  return isPlaying || isFadingOut;
}
