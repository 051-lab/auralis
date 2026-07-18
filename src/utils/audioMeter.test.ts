import { describe, expect, it } from 'vitest';
import {
  METER_FLOOR_DB,
  amplitudeToDb,
  analyzeMeterSamples,
  classifyMeterLevel,
  createOutputMeter,
  createSilentOutputMeter,
  formatDb,
} from './audioMeter';

describe('audioMeter', () => {
  it('converts linear amplitudes to dBFS with a safe floor', () => {
    expect(amplitudeToDb(1)).toBeCloseTo(0, 6);
    expect(amplitudeToDb(0.5)).toBeCloseTo(-6.0206, 4);
    expect(amplitudeToDb(0)).toBe(METER_FLOOR_DB);
    expect(amplitudeToDb(Number.NaN)).toBe(METER_FLOOR_DB);
  });

  it('calculates RMS and peak levels from samples', () => {
    const samples = new Float32Array([0.5, -1, 0.25]);
    const meter = analyzeMeterSamples(samples);

    expect(meter.peakLinear).toBe(1);
    expect(meter.peakDb).toBeCloseTo(0, 6);
    expect(meter.rmsDb).toBeCloseTo(20 * Math.log10(Math.sqrt(1.3125 / 3)), 6);
  });

  it('returns safe defaults for missing or invalid samples', () => {
    expect(analyzeMeterSamples(null)).toEqual({
      rmsDb: METER_FLOOR_DB,
      peakDb: METER_FLOOR_DB,
      peakLinear: 0,
    });

    expect(analyzeMeterSamples([Number.NaN])).toEqual({
      rmsDb: METER_FLOOR_DB,
      peakDb: METER_FLOOR_DB,
      peakLinear: 0,
    });
  });

  it('classifies safe, hot, limiter, and clip-risk levels', () => {
    expect(classifyMeterLevel(-18)).toEqual({
      isHot: false,
      isClipping: false,
      limiterActive: false,
    });

    expect(classifyMeterLevel(-5)).toEqual({
      isHot: true,
      isClipping: false,
      limiterActive: false,
    });

    expect(classifyMeterLevel(-1.5, { limiterReductionDb: -2 })).toEqual({
      isHot: true,
      isClipping: false,
      limiterActive: true,
    });

    expect(classifyMeterLevel(-0.7, { inputPeakDb: 0.2, limiterReductionDb: -3 })).toEqual({
      isHot: true,
      isClipping: true,
      limiterActive: true,
    });
  });

  it('creates a full output meter from samples', () => {
    const meter = createOutputMeter(new Float32Array([0.1, -0.2, 0.3]));

    expect(meter.rmsDb).toBeLessThan(0);
    expect(meter.peakDb).toBeCloseTo(20 * Math.log10(0.3), 6);
    expect(meter.peakLinear).toBeCloseTo(0.3, 6);
    expect(meter.inputPeakDb).toBe(meter.outputPeakDb);
    expect(meter.limiterReductionDb).toBe(0);
    expect(meter.isHot).toBe(false);
  });

  it('formats dB values for compact UI readouts', () => {
    expect(formatDb(METER_FLOOR_DB)).toBe('-inf dB');
    expect(formatDb(-12.345)).toBe('-12.3 dB');
  });

  it('creates a silent output meter object', () => {
    expect(createSilentOutputMeter()).toEqual({
      rmsDb: METER_FLOOR_DB,
      peakDb: METER_FLOOR_DB,
      peakLinear: 0,
      inputPeakDb: METER_FLOOR_DB,
      outputPeakDb: METER_FLOOR_DB,
      limiterReductionDb: 0,
      isHot: false,
      isClipping: false,
      inputClipRisk: false,
      limiterActive: false,
    });
  });
});
