import { describe, expect, it } from 'vitest';
import { buildCreatorExportDraft } from './creatorExport';

describe('creator export draft', () => {
  it('builds responsible copy for an Auralis session', () => {
    const draft = buildCreatorExportDraft({
      creatorSession: {
        title: 'Evening Rain Focus',
        purpose: 'Relaxed background listening',
        notes: 'Leave ten seconds of room tone at the end.',
        visualTheme: 'Slow cyan ring with rain texture',
        storyboardNotes: 'Open wide, then slowly settle on the central orb.',
        durationMinutes: 90,
        exportSlug: 'evening-rain-focus-longform',
      },
      presetName: 'Soft Noise Cocoon',
      recordingModeLabel: 'Wet Export',
      isBinauralMode: false,
      headphonesRecommended: false,
    });

    expect(draft.title).toBe('Evening Rain Focus');
    expect(draft.durationLabel).toBe('1 hr 30 min');
    expect(draft.fileNameStem).toBe('evening-rain-focus-longform');
    expect(draft.description).toContain('intended for relaxed background listening');
    expect(draft.description).toContain('Target duration: 1 hr 30 min');
    expect(draft.description).toContain('Storyboard notes: Open wide');
    expect(draft.description).toContain('Auralis is not medical software');
    expect(draft.tags).toContain('relaxed-background-listening');
    expect(draft.checklist).toContain('Start at low listening volume before recording.');
    expect(draft.copyText).toContain('Pre-export checklist:');
  });

  it('adds headphone guidance for binaural sessions', () => {
    const draft = buildCreatorExportDraft({
      creatorSession: {
        title: '',
        purpose: '',
        notes: '',
        visualTheme: '',
        storyboardNotes: '',
        durationMinutes: 30,
        exportSlug: '',
      },
      presetName: 'Theta Meditation Gate (6Hz)',
      recordingModeLabel: 'Wet Export',
      isBinauralMode: true,
      headphonesRecommended: true,
    });

    expect(draft.title).toBe('Theta Meditation Gate (6Hz)');
    expect(draft.fileNameStem).toBe('theta-meditation-gate-6hz');
    expect(draft.checklist).toContain(
      'Mention that stereo headphones are recommended for this session.'
    );
  });
});
