import { describe, expect, it } from 'vitest';
import { getPlaybackStatus, isAudiblePlayback } from './playbackState';

describe('playbackState', () => {
  it('prioritizes fading state over live playback for visible status', () => {
    expect(getPlaybackStatus(false, false)).toBe('Standby');
    expect(getPlaybackStatus(true, false)).toBe('Live');
    expect(getPlaybackStatus(false, true)).toBe('Fading');
    expect(getPlaybackStatus(true, true)).toBe('Fading');
  });

  it('treats fading output as audible for meters and visualizers', () => {
    expect(isAudiblePlayback(false, false)).toBe(false);
    expect(isAudiblePlayback(true, false)).toBe(true);
    expect(isAudiblePlayback(false, true)).toBe(true);
  });
});
