import { describe, expect, it } from 'vitest';
import {
  getRecordingModeDescription,
  getRecordingModeLabel,
} from './recordingExport';

describe('recordingExport', () => {
  it('labels both recording paths as safety-limited', () => {
    expect(getRecordingModeLabel('wet')).toBe('Wet Export (limited)');
    expect(getRecordingModeLabel('dry')).toBe('Dry Export (limited)');
  });

  it('describes the dry export path without implying FX processing', () => {
    const description = getRecordingModeDescription('dry');

    expect(description).toContain('skips reverb and auto-panner');
    expect(description).toContain('safety limiter');
  });

  it('describes the wet export path as the full output chain', () => {
    const description = getRecordingModeDescription('wet');

    expect(description).toContain('includes reverb and auto-panner');
    expect(description).toContain('output safety limiter');
  });
});
