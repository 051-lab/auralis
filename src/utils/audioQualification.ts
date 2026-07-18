export type SignalMetrics = {
  sampleCount: number;
  peak: number;
  rms: number;
  dcOffset: number;
  clippingCount: number;
  nonFiniteCount: number;
};

export type StereoMetrics = {
  left: SignalMetrics;
  right: SignalMetrics;
  maximumChannelDelta: number;
  correlation: number;
};

function assertEqualChannelLengths(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): void {
  if (left.length !== right.length) {
    throw new RangeError(
      `Channel lengths must match (left: ${left.length}, right: ${right.length})`,
    );
  }
}

export function analyzeSignal(samples: ArrayLike<number>): SignalMetrics {
  let peak = 0;
  let sum = 0;
  let sumSquares = 0;
  let clippingCount = 0;
  let finiteCount = 0;
  let nonFiniteCount = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];

    if (!Number.isFinite(sample)) {
      nonFiniteCount += 1;
      continue;
    }

    const absoluteSample = Math.abs(sample);
    peak = Math.max(peak, absoluteSample);
    sum += sample;
    sumSquares += sample * sample;
    finiteCount += 1;

    if (absoluteSample >= 1) {
      clippingCount += 1;
    }
  }

  return {
    sampleCount: samples.length,
    peak,
    rms: finiteCount === 0 ? 0 : Math.sqrt(sumSquares / finiteCount),
    dcOffset: finiteCount === 0 ? 0 : sum / finiteCount,
    clippingCount,
    nonFiniteCount,
  };
}

export function maximumChannelDelta(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number {
  assertEqualChannelLengths(left, right);
  const sampleCount = left.length;
  let maximumDelta = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const leftSample = left[index];
    const rightSample = right[index];

    if (!Number.isFinite(leftSample) || !Number.isFinite(rightSample)) {
      return Number.POSITIVE_INFINITY;
    }

    maximumDelta = Math.max(maximumDelta, Math.abs(leftSample - rightSample));
  }

  return maximumDelta;
}

export function channelCorrelation(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number {
  assertEqualChannelLengths(left, right);
  const sampleCount = left.length;

  if (sampleCount === 0) {
    return 0;
  }

  let leftSum = 0;
  let rightSum = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const leftSample = left[index];
    const rightSample = right[index];

    if (!Number.isFinite(leftSample) || !Number.isFinite(rightSample)) {
      return 0;
    }

    leftSum += leftSample;
    rightSum += rightSample;
  }

  const leftMean = leftSum / sampleCount;
  const rightMean = rightSum / sampleCount;
  let covariance = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const centeredLeft = left[index] - leftMean;
    const centeredRight = right[index] - rightMean;
    covariance += centeredLeft * centeredRight;
    leftEnergy += centeredLeft * centeredLeft;
    rightEnergy += centeredRight * centeredRight;
  }

  const denominator = Math.sqrt(leftEnergy * rightEnergy);
  return denominator === 0 ? 0 : covariance / denominator;
}

export function analyzeStereo(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): StereoMetrics {
  assertEqualChannelLengths(left, right);

  return {
    left: analyzeSignal(left),
    right: analyzeSignal(right),
    maximumChannelDelta: maximumChannelDelta(left, right),
    correlation: channelCorrelation(left, right),
  };
}
