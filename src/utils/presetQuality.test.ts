import { describe, expect, it } from 'vitest';
import type { Preset } from '@/store/useAuralisStore';
import { useAuralisStore } from '@/store/useAuralisStore';
import { auditPresetQuality } from './presetQuality';

const basePreset: Preset = {
  id: 'built-in-test',
  version: 2,
  name: 'Test Preset',
  description: 'Responsible test preset.',
  intendedUse: 'Testing',
  headphonesRecommended: false,
  exportReady: true,
  caution: 'Start low.',
  tags: [],
  oscillators: [
    {
      frequency: 200,
      detuneCents: 0,
      gain: 0.2,
      waveform: 'sine',
      pan: 0,
      phaseDegrees: 0,
      muted: false,
      soloed: false,
      tremoloEnabled: false,
      tremoloShape: 'sine',
      tremoloRate: 2,
      tremoloDepth: 0.2,
      attackSeconds: 0.02,
      releaseSeconds: 0.2,
    },
  ],
  masterFX: {
    masterVolume: 0.6,
    limiterThresholdDb: -1,
    reverbWet: 0.1,
    reverbDecay: 6,
    reverbPreDelay: 0.01,
    autoPannerRate: 0,
    autoPannerDepth: 0,
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
  },
  noiseEnabled: false,
  noiseType: 'brown',
  noiseGain: 0,
  noiseHighpassFrequency: 20,
  noiseLowpassFrequency: 12000,
  noiseStereoWidth: 0.5,
  modulation: {
    mode: 'off',
    rate: 0.08,
    depth: 0.2,
    targets: {
      noiseFilter: true,
      noiseWidth: true,
      oscillatorPan: false,
    },
  },
  textureLayer: {
    enabled: false,
    type: 'rain',
    gain: 0,
    tone: 0.5,
    width: 0.5,
    motion: 0,
  },
  creatorSession: {
    title: '',
    purpose: 'Testing',
    notes: '',
    visualTheme: '',
    storyboardNotes: '',
    durationMinutes: 30,
    exportSlug: '',
  },
  createdAt: 1,
};

describe('preset quality audit', () => {
  it('flags binaural presets with stereo motion conflicts', () => {
    const findings = auditPresetQuality([
      {
        ...basePreset,
        headphonesRecommended: true,
        tags: ['binaural'],
        masterFX: {
          ...basePreset.masterFX,
          autoPannerDepth: 0.4,
        },
        modulation: {
          ...basePreset.modulation,
          targets: {
            ...basePreset.modulation.targets,
            oscillatorPan: true,
          },
        },
      },
    ]);

    expect(findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([
        'Binaural-style preset should keep auto-panner depth near zero.',
        'Binaural-style preset should not enable oscillator-pan modulation.',
      ])
    );
  });

  it('flags high-risk gain staging', () => {
    const findings = auditPresetQuality([
      {
        ...basePreset,
        oscillators: [0.7, 0.7, 0.7, 0.7].map((gain, index) => ({
          ...basePreset.oscillators[0],
          frequency: 200 + index * 100,
          gain,
        })),
      },
    ]);

    expect(findings.some((finding) => finding.severity === 'error')).toBe(true);
    expect(findings.map((finding) => finding.message)).toContain(
      'Estimated source load may push the limiter.'
    );
  });

  it('keeps current built-in presets clear of code-level quality errors', () => {
    const builtInPresets = useAuralisStore
      .getState()
      .presets.filter((preset) => preset.id.startsWith('built-in-'));
    const findings = auditPresetQuality(builtInPresets);

    expect(findings.filter((finding) => finding.severity === 'error')).toEqual([]);
  });
});
