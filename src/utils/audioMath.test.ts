import { describe, expect, it } from 'vitest';
import {
  applyCentsDetune,
  centsToFrequencyRatio,
  clampFrequency,
  formatFrequency,
  frequencyRatioToCents,
  getCentsDifference,
  linearToLogFrequency,
  logFrequencyToLinear,
  nudgeFrequency,
} from './audioMath';
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

  it('clamps and nudges frequencies inside the supported range', () => {
    expect(clampFrequency(Number.NaN)).toBe(20);
    expect(clampFrequency(5)).toBe(20);
    expect(clampFrequency(440)).toBe(440);
    expect(clampFrequency(50000)).toBe(20000);

    expect(nudgeFrequency(440, 10)).toBe(450);
    expect(nudgeFrequency(25, -10)).toBe(20);
    expect(nudgeFrequency(19995, 10)).toBe(20000);
  });

  it('converts cents and frequency ratios for detune utilities', () => {
    expect(centsToFrequencyRatio(0)).toBe(1);
    expect(centsToFrequencyRatio(1200)).toBeCloseTo(2, 8);
    expect(frequencyRatioToCents(2)).toBeCloseTo(1200, 8);
    expect(frequencyRatioToCents(0)).toBe(0);
  });

  it('applies cents detune with frequency bounds', () => {
    expect(applyCentsDetune(440, 100)).toBeCloseTo(466.1638, 3);
    expect(applyCentsDetune(20, -1200)).toBe(20);
    expect(applyCentsDetune(20000, 1200)).toBe(20000);
  });

  it('calculates cents difference between frequencies', () => {
    expect(getCentsDifference(880, 440)).toBeCloseTo(1200, 8);
    expect(getCentsDifference(466.1638, 440)).toBeCloseTo(100, 3);
    expect(getCentsDifference(0, 440)).toBe(0);
    expect(getCentsDifference(440, 0)).toBe(0);
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
