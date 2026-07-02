import { amplitudeToDb } from './audioMeter';

export type GainStageStatus = 'safe' | 'warm' | 'hot' | 'limiter-risk';

export interface GainStageSource {
  gain?: number;
  muted?: boolean;
  soloed?: boolean;
}

export interface GainStageBudgetInput {
  oscillators: GainStageSource[];
  masterVolume?: number;
  engineHeadroom?: number;
  noiseEnabled?: boolean;
  noiseGain?: number;
}

export interface GainStageBudget {
  audibleOscillatorCount: number;
  oscillatorGainSum: number;
  noiseContribution: number;
  sourceLoad: number;
  estimatedPeakLinear: number;
  estimatedPeakDb: number;
  status: GainStageStatus;
}

export const DEFAULT_ENGINE_HEADROOM_GAIN = 0.8;
export const DEFAULT_NOMINAL_PEAK_TARGET = 0.75;
export const DEFAULT_HOT_PEAK_TARGET = 0.9;
export const DEFAULT_LIMITER_RISK_TARGET = 1;
const NOMINAL_NOISE_PEAK_WEIGHT = 0.5;

function normalizeGain(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;

  return Math.max(0, Math.min(1, value));
}

function classifyGainStage(estimatedPeakLinear: number): GainStageStatus {
  if (estimatedPeakLinear >= DEFAULT_LIMITER_RISK_TARGET) return 'limiter-risk';
  if (estimatedPeakLinear >= DEFAULT_HOT_PEAK_TARGET) return 'hot';
  if (estimatedPeakLinear > DEFAULT_NOMINAL_PEAK_TARGET) return 'warm';

  return 'safe';
}

export function calculateGainStageBudget({
  oscillators,
  masterVolume = 1,
  engineHeadroom = DEFAULT_ENGINE_HEADROOM_GAIN,
  noiseEnabled = false,
  noiseGain = 0,
}: GainStageBudgetInput): GainStageBudget {
  const hasSoloedOscillator = oscillators.some(
    (oscillator) => oscillator.soloed && !oscillator.muted
  );
  const audibleOscillatorGains = oscillators
    .filter((oscillator) => !oscillator.muted)
    .filter((oscillator) => !hasSoloedOscillator || oscillator.soloed)
    .map((oscillator) => normalizeGain(oscillator.gain));
  const oscillatorGainSum = audibleOscillatorGains.reduce((sum, gain) => sum + gain, 0);
  const noiseContribution = noiseEnabled
    ? normalizeGain(noiseGain) * NOMINAL_NOISE_PEAK_WEIGHT
    : 0;
  const sourceLoad = oscillatorGainSum + noiseContribution;
  const estimatedPeakLinear =
    sourceLoad * normalizeGain(masterVolume, 1) * normalizeGain(engineHeadroom, 1);

  return {
    audibleOscillatorCount: audibleOscillatorGains.length,
    oscillatorGainSum,
    noiseContribution,
    sourceLoad,
    estimatedPeakLinear,
    estimatedPeakDb: amplitudeToDb(estimatedPeakLinear),
    status: classifyGainStage(estimatedPeakLinear),
  };
}
