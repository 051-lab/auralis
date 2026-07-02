import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENGINE_HEADROOM_GAIN,
  calculateGainStageBudget,
} from './gainStaging';

describe('gainStaging', () => {
  it('keeps the calibrated first-load oscillator stack below the nominal target', () => {
    const budget = calculateGainStageBudget({
      oscillators: [
        { gain: 0.35 },
        { gain: 0.35 },
        { gain: 0.35 },
        { gain: 0.35 },
      ],
      masterVolume: 0.6,
    });

    expect(budget.audibleOscillatorCount).toBe(4);
    expect(budget.oscillatorGainSum).toBeCloseTo(1.4, 6);
    expect(budget.estimatedPeakLinear).toBeCloseTo(
      1.4 * 0.6 * DEFAULT_ENGINE_HEADROOM_GAIN,
      6
    );
    expect(budget.status).toBe('safe');
  });

  it('classifies hotter stacked gains before they reach the limiter', () => {
    expect(
      calculateGainStageBudget({
        oscillators: [{ gain: 0.4 }, { gain: 0.4 }, { gain: 0.4 }, { gain: 0.4 }],
        masterVolume: 0.6,
      }).status
    ).toBe('warm');

    expect(
      calculateGainStageBudget({
        oscillators: [{ gain: 0.5 }, { gain: 0.5 }, { gain: 0.5 }, { gain: 0.5 }],
        masterVolume: 0.6,
      }).status
    ).toBe('hot');

    expect(
      calculateGainStageBudget({
        oscillators: [{ gain: 0.6 }, { gain: 0.6 }, { gain: 0.6 }, { gain: 0.6 }],
        masterVolume: 0.6,
      }).status
    ).toBe('limiter-risk');
  });

  it('honors mute and solo states when estimating audible source load', () => {
    const budget = calculateGainStageBudget({
      oscillators: [
        { gain: 0.8 },
        { gain: 0.7, muted: true },
        { gain: 0.4, soloed: true },
        { gain: 0.6 },
      ],
      masterVolume: 0.6,
    });

    expect(budget.audibleOscillatorCount).toBe(1);
    expect(budget.oscillatorGainSum).toBeCloseTo(0.4, 6);
    expect(budget.status).toBe('safe');
  });

  it('adds a conservative noise contribution only when noise is enabled', () => {
    const silentNoiseBudget = calculateGainStageBudget({
      oscillators: [{ gain: 0.3 }],
      masterVolume: 0.6,
      noiseEnabled: false,
      noiseGain: 0.8,
    });
    const activeNoiseBudget = calculateGainStageBudget({
      oscillators: [{ gain: 0.3 }],
      masterVolume: 0.6,
      noiseEnabled: true,
      noiseGain: 0.8,
    });

    expect(silentNoiseBudget.noiseContribution).toBe(0);
    expect(activeNoiseBudget.noiseContribution).toBeCloseTo(0.4, 6);
    expect(activeNoiseBudget.estimatedPeakLinear).toBeGreaterThan(
      silentNoiseBudget.estimatedPeakLinear
    );
  });
});
