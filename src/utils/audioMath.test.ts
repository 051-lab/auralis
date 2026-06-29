import { describe, expect, it } from 'vitest';
import { formatFrequency, linearToLogFrequency, logFrequencyToLinear } from './audioMath';
import { clamp, clampUnknown } from './math';

describe('audioMath', () => {
  it('round-trips logarithmic frequency conversion', () => {
    const frequencies = [20, 55, 174, 440, 528, 1000, 9630, 20000];

    frequencies.forEach((frequency) => {
      const linear = logFrequencyToLinear(frequency);
      const roundTrip = linearToLogFrequency(linear);

      expect(roundTrip).toBeCloseTo(frequency, 6);
    });
  });

  it('clamps linear and logarithmic inputs to supported frequency bounds', () => {
    expect(linearToLogFrequency(-1)).toBe(20);
    expect(linearToLogFrequency(2)).toBe(20000);
    expect(logFrequencyToLinear(1)).toBe(0);
    expect(logFrequencyToLinear(50000)).toBe(1);
  });

  it('formats hertz and kilohertz values', () => {
    expect(formatFrequency(528)).toBe('528.00 Hz');
    expect(formatFrequency(1200)).toBe('1.20 kHz');
  });
});

describe('math helpers', () => {
  it('clamps numbers', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(Number.NaN, 0, 1)).toBe(0);
  });

  it('clamps unknown values with fallbacks', () => {
    expect(clampUnknown('bad', 0, 1, 0.4)).toBe(0.4);
    expect(clampUnknown(2, 0, 1, 0.4)).toBe(1);
  });
});
