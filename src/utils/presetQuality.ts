import type { Preset } from '@/store/useAuralisStore';
import { calculateGainStageBudget } from './gainStaging';

export type PresetQualitySeverity = 'warning' | 'error';

export interface PresetQualityFinding {
  presetId: string;
  presetName: string;
  severity: PresetQualitySeverity;
  message: string;
}

function isBinauralPreset(preset: Preset): boolean {
  return preset.headphonesRecommended || preset.tags.includes('binaural');
}

function addFinding(
  findings: PresetQualityFinding[],
  preset: Preset,
  severity: PresetQualitySeverity,
  message: string
): void {
  findings.push({
    presetId: preset.id,
    presetName: preset.name,
    severity,
    message,
  });
}

export function auditPresetQuality(presets: Preset[]): PresetQualityFinding[] {
  const findings: PresetQualityFinding[] = [];

  presets.forEach((preset) => {
    const gainBudget = calculateGainStageBudget({
      oscillators: preset.oscillators,
      noiseEnabled: preset.noiseEnabled,
      noiseGain: preset.noiseGain,
      masterVolume: preset.masterFX.masterVolume,
    });
    const binauralPreset = isBinauralPreset(preset);

    if (gainBudget.status === 'limiter-risk') {
      addFinding(findings, preset, 'error', 'Estimated source load may push the limiter.');
    } else if (gainBudget.status === 'hot') {
      addFinding(findings, preset, 'warning', 'Estimated source load is hot; meter review required.');
    }

    if (!preset.description.trim()) {
      addFinding(findings, preset, 'error', 'Preset needs a responsible description.');
    }

    if (!preset.intendedUse.trim()) {
      addFinding(findings, preset, 'warning', 'Preset should include an intended-use label.');
    }

    if (binauralPreset) {
      if (preset.masterFX.autoPannerDepth > 0.05) {
        addFinding(
          findings,
          preset,
          'error',
          'Binaural-style preset should keep auto-panner depth near zero.'
        );
      }

      if (preset.modulation.targets.oscillatorPan) {
        addFinding(
          findings,
          preset,
          'error',
          'Binaural-style preset should not enable oscillator-pan modulation.'
        );
      }

      if (preset.textureLayer.enabled && preset.textureLayer.width > 0.65) {
        addFinding(
          findings,
          preset,
          'warning',
          'Binaural-style preset texture width should stay conservative.'
        );
      }
    }

    if (preset.noiseEnabled && preset.noiseType === 'white' && preset.noiseGain > 0.15) {
      addFinding(findings, preset, 'warning', 'White noise gain should stay conservative.');
    }
  });

  return findings;
}
