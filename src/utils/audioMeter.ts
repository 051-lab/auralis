export interface OutputMeterReading {
  rmsDb: number;
  peakDb: number;
  peakLinear: number;
  inputPeakDb: number;
  outputPeakDb: number;
  limiterReductionDb: number;
  isHot: boolean;
  isClipping: boolean;
  inputClipRisk: boolean;
  limiterActive: boolean;
}

export interface MeterThresholds {
  hotDb?: number;
  clipDb?: number;
  limiterThresholdDb?: number;
  inputPeakDb?: number;
  limiterReductionDb?: number;
}

export const METER_FLOOR_DB = -96;
export const DEFAULT_HOT_DB = -6;
export const DEFAULT_CLIP_DB = 0;
export const DEFAULT_LIMITER_THRESHOLD_DB = -1;
export const LIMITER_ACTIVE_REDUCTION_DB = -0.1;

export function amplitudeToDb(amplitude: number): number {
  if (!Number.isFinite(amplitude) || amplitude <= 0) return METER_FLOOR_DB;

  return Math.max(METER_FLOOR_DB, 20 * Math.log10(Math.abs(amplitude)));
}

export function analyzeMeterSamples(samples?: ArrayLike<number> | null): {
  rmsDb: number;
  peakDb: number;
  peakLinear: number;
} {
  if (!samples || samples.length === 0) {
    return {
      rmsDb: METER_FLOOR_DB,
      peakDb: METER_FLOOR_DB,
      peakLinear: 0,
    };
  }

  let sumSquares = 0;
  let peakLinear = 0;
  let sampleCount = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    if (!Number.isFinite(sample)) continue;

    const absoluteSample = Math.abs(sample);
    sumSquares += absoluteSample * absoluteSample;
    peakLinear = Math.max(peakLinear, absoluteSample);
    sampleCount += 1;
  }

  if (sampleCount === 0) {
    return {
      rmsDb: METER_FLOOR_DB,
      peakDb: METER_FLOOR_DB,
      peakLinear: 0,
    };
  }

  const rmsLinear = Math.sqrt(sumSquares / sampleCount);

  return {
    rmsDb: amplitudeToDb(rmsLinear),
    peakDb: amplitudeToDb(peakLinear),
    peakLinear,
  };
}

export function classifyMeterLevel(
  outputPeakDb: number,
  thresholds: MeterThresholds = {}
): Pick<OutputMeterReading, 'isHot' | 'isClipping' | 'limiterActive'> {
  const hotDb = thresholds.hotDb ?? DEFAULT_HOT_DB;
  const clipDb = thresholds.clipDb ?? DEFAULT_CLIP_DB;
  const inputPeakDb = thresholds.inputPeakDb ?? outputPeakDb;
  const limiterReductionDb = Math.min(0, thresholds.limiterReductionDb ?? 0);

  return {
    isHot: outputPeakDb >= hotDb,
    isClipping: inputPeakDb >= clipDb,
    limiterActive: limiterReductionDb <= LIMITER_ACTIVE_REDUCTION_DB,
  };
}

export function createSilentOutputMeter(): OutputMeterReading {
  return {
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
  };
}

export function createOutputMeter(
  outputSamples?: ArrayLike<number> | null,
  thresholds: MeterThresholds = {}
): OutputMeterReading {
  const outputAnalysis = analyzeMeterSamples(outputSamples);
  const inputPeakDb = thresholds.inputPeakDb ?? outputAnalysis.peakDb;
  const limiterReductionDb = Math.min(0, thresholds.limiterReductionDb ?? 0);
  const classification = classifyMeterLevel(outputAnalysis.peakDb, {
    ...thresholds,
    inputPeakDb,
    limiterReductionDb,
  });

  return {
    ...outputAnalysis,
    inputPeakDb,
    outputPeakDb: outputAnalysis.peakDb,
    limiterReductionDb,
    ...classification,
    inputClipRisk: classification.isClipping,
  };
}

export function formatDb(value: number): string {
  if (!Number.isFinite(value) || value <= METER_FLOOR_DB) return '-inf dB';

  return `${value.toFixed(1)} dB`;
}
