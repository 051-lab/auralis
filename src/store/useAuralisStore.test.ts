import { describe, expect, it } from 'vitest';
import {
  CURRENT_PRESET_VERSION,
  getEffectiveOscillatorGain,
  normalizeCreatorSession,
  normalizeMasterFX,
  normalizeModulation,
  normalizeNoiseHighpassFrequency,
  normalizeNoiseLowpassFrequency,
  normalizeNoiseStereoWidth,
  normalizeOscillators,
  normalizePresetTags,
  normalizeTextureLayer,
  useAuralisStore,
} from './useAuralisStore';

describe('store normalization', () => {
  it('normalizes missing master FX fields with current defaults', () => {
    expect(normalizeMasterFX({ reverbWet: 2, autoPannerRate: -1 })).toEqual({
      masterVolume: 0.6,
      limiterThresholdDb: -1,
      reverbWet: 1,
      reverbDecay: 6,
      reverbPreDelay: 0.01,
      autoPannerRate: 0,
      autoPannerDepth: 0.5,
      eqEnabled: false,
      eqLowGain: 0,
      eqMidGain: 0,
      eqHighGain: 0,
      stereoWidth: 0.5,
      delayEnabled: false,
      delayWet: 0,
      delayTime: 0.25,
      delayFeedback: 0.2,
      chorusEnabled: false,
      chorusWet: 0,
      chorusRate: 0.8,
      chorusDepth: 0.2,
    });
  });

  it('normalizes oscillator arrays to four safe oscillator states', () => {
    const oscillators = normalizeOscillators([
      {
        frequency: 50000,
        detuneCents: 2000,
        gain: -1,
        waveform: 'triangle',
        pan: 3,
        phaseDegrees: 720,
        muted: true,
        soloed: true,
        tremoloShape: 'square',
        tremoloRate: 100,
        tremoloDepth: 2,
        attackSeconds: 10,
        releaseSeconds: 20,
      },
    ]);

    expect(oscillators).toHaveLength(4);
    expect(oscillators[0]).toMatchObject({
      frequency: 20000,
      detuneCents: 1200,
      gain: 0,
      waveform: 'triangle',
      pan: 1,
      phaseDegrees: 360,
      muted: true,
      soloed: true,
      tremoloShape: 'square',
      tremoloRate: 30,
      tremoloDepth: 1,
      attackSeconds: 5,
      releaseSeconds: 10,
    });
    expect(oscillators[1]).toMatchObject({
      gain: 0.35,
      muted: false,
      soloed: false,
    });
    expect(oscillators[1].frequency).toBe(300);
  });

  it('derives effective gain without overwriting stored gain values', () => {
    const [audible, muted, soloed] = normalizeOscillators([
      { gain: 0.4 },
      { gain: 0.7, muted: true },
      { gain: 0.5, soloed: true },
    ]);

    expect(getEffectiveOscillatorGain(audible, false)).toBe(0.4);
    expect(getEffectiveOscillatorGain(muted, false)).toBe(0);
    expect(getEffectiveOscillatorGain(audible, true)).toBe(0);
    expect(getEffectiveOscillatorGain(soloed, true)).toBe(0.5);
  });

  it('normalizes noise filter cutoff ranges', () => {
    expect(normalizeNoiseHighpassFrequency(undefined)).toBe(20);
    expect(normalizeNoiseHighpassFrequency(5)).toBe(20);
    expect(normalizeNoiseHighpassFrequency(250)).toBe(250);
    expect(normalizeNoiseHighpassFrequency(800)).toBe(500);

    expect(normalizeNoiseLowpassFrequency(undefined)).toBe(12000);
    expect(normalizeNoiseLowpassFrequency(100)).toBe(500);
    expect(normalizeNoiseLowpassFrequency(6400)).toBe(6400);
    expect(normalizeNoiseLowpassFrequency(20000)).toBe(12000);

    expect(normalizeNoiseStereoWidth(undefined)).toBe(0.5);
    expect(normalizeNoiseStereoWidth(-1)).toBe(0);
    expect(normalizeNoiseStereoWidth(0.65)).toBe(0.65);
    expect(normalizeNoiseStereoWidth(2)).toBe(1);
  });

  it('normalizes preset tags to a compact unique list', () => {
    expect(
      normalizePresetTags(['Focus', ' focus ', 'Meditation', '', 12, 'VeryLongPresetTagNameBeyondLimit'])
    ).toEqual(['focus', 'meditation', 'verylongpresettagnamebey']);
  });

  it('normalizes modulation settings and targets', () => {
    expect(
      normalizeModulation({
        mode: 'pulse',
        rate: 2,
        depth: -1,
        targets: {
          noiseFilter: false,
          noiseWidth: true,
          oscillatorPan: true,
        },
      })
    ).toEqual({
      mode: 'pulse',
      rate: 1,
      depth: 0,
      targets: {
        noiseFilter: false,
        noiseWidth: true,
        oscillatorPan: true,
      },
    });
  });

  it('normalizes texture layer settings', () => {
    expect(
      normalizeTextureLayer({
        enabled: true,
        type: 'storm',
        gain: 2,
        tone: -1,
        width: 0.65,
        motion: 3,
      })
    ).toEqual({
      enabled: true,
      type: 'storm',
      gain: 1,
      tone: 0,
      width: 0.65,
      motion: 1,
    });
  });

  it('normalizes creator session text fields', () => {
    expect(
      normalizeCreatorSession({
        title: '  ',
        purpose: 'Long Relaxation',
        notes: 'Keep the intro quiet.',
        visualTheme: 'Cyan pulse ring',
        storyboardNotes: 'Start wide, then slowly zoom into the orb.',
        durationMinutes: 999,
        exportSlug: 'Evening Session',
      })
    ).toEqual({
      title: '',
      purpose: 'Long Relaxation',
      notes: 'Keep the intro quiet.',
      visualTheme: 'Cyan pulse ring',
      storyboardNotes: 'Start wide, then slowly zoom into the orb.',
      durationMinutes: 720,
      exportSlug: 'Evening Session',
    });
  });

  it('exposes the current preset version', () => {
    expect(CURRENT_PRESET_VERSION).toBe(2);
  });

  it('tracks loaded preset identity and modified state', () => {
    const store = useAuralisStore.getState();

    store.loadPreset('built-in-alpha-relaxed-focus-10hz');

    expect(useAuralisStore.getState()).toMatchObject({
      activePresetId: 'built-in-alpha-relaxed-focus-10hz',
      activePresetName: 'Alpha Relaxed Focus (10Hz)',
      activePresetSource: 'built-in',
      isActivePresetModified: false,
    });

    useAuralisStore.getState().markActivePresetModified();
    expect(useAuralisStore.getState().isActivePresetModified).toBe(true);

    useAuralisStore.getState().resetToDefaults();
    expect(useAuralisStore.getState()).toMatchObject({
      activePresetId: null,
      activePresetName: null,
      activePresetSource: null,
      isActivePresetModified: false,
    });
  });
});
