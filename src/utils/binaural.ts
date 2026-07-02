export type BinauralBeatBand = 'low' | 'common' | 'high' | 'experimental';

export interface BinauralGuidance {
  band: BinauralBeatBand;
  label: string;
  tone: 'cyan' | 'emerald' | 'amber' | 'violet';
  summary: string;
  caution: string;
}

export interface BinauralPair {
  baseFrequency: number;
  beatFrequency: number;
  upperFrequency: number;
  guidance: BinauralGuidance;
  baseAdjusted: boolean;
  beatAdjusted: boolean;
}

export const MIN_BINAURAL_BASE_FREQUENCY = 20;
export const MIN_BINAURAL_BEAT_FREQUENCY = 0.5;
export const MAX_BINAURAL_BEAT_FREQUENCY = 60;
export const DEFAULT_BINAURAL_BASE_FREQUENCY = 400;
export const DEFAULT_BINAURAL_BEAT_FREQUENCY = 6;
export const MAX_BINAURAL_CARRIER_FREQUENCY = 20000;

const GUIDANCE_BY_BAND: Record<BinauralBeatBand, BinauralGuidance> = {
  low: {
    band: 'low',
    label: 'Gentle',
    tone: 'cyan',
    summary: 'Slow beat difference intended for quiet wind-down sessions.',
    caution: 'Keep volume low; slow binaural sessions may feel sleepy or heavy.',
  },
  common: {
    band: 'common',
    label: 'Steady',
    tone: 'emerald',
    summary: 'Common meditation and focus-inspired beat range.',
    caution: 'Use stereo headphones and stop if the sound feels uncomfortable.',
  },
  high: {
    band: 'high',
    label: 'Focused',
    tone: 'amber',
    summary: 'Faster beat difference that can feel more alert or intense.',
    caution: 'Use shorter sessions at low volume if this feels fatiguing.',
  },
  experimental: {
    band: 'experimental',
    label: 'Experimental',
    tone: 'violet',
    summary: 'High beat difference for brief exploratory listening.',
    caution: 'Treat this as experimental; avoid long sessions if it feels distracting.',
  },
};

export function classifyBinauralBeat(beatFrequency: number): BinauralBeatBand {
  if (!Number.isFinite(beatFrequency) || beatFrequency <= 0) return 'low';
  if (beatFrequency <= 4) return 'low';
  if (beatFrequency <= 14) return 'common';
  if (beatFrequency <= 30) return 'high';

  return 'experimental';
}

export function getBinauralGuidance(beatFrequency: number): BinauralGuidance {
  return GUIDANCE_BY_BAND[classifyBinauralBeat(beatFrequency)];
}

export function normalizeBinauralBeatFrequency(beatFrequency: number): number {
  if (!Number.isFinite(beatFrequency)) return DEFAULT_BINAURAL_BEAT_FREQUENCY;

  return Math.max(
    MIN_BINAURAL_BEAT_FREQUENCY,
    Math.min(MAX_BINAURAL_BEAT_FREQUENCY, beatFrequency)
  );
}

export function normalizeBinauralBaseFrequency(
  baseFrequency: number,
  beatFrequency: number
): number {
  const safeBeatFrequency = Number.isFinite(beatFrequency) ? Math.max(0, beatFrequency) : 0;
  const maxBaseFrequency = Math.max(
    MIN_BINAURAL_BASE_FREQUENCY,
    MAX_BINAURAL_CARRIER_FREQUENCY - safeBeatFrequency
  );

  if (!Number.isFinite(baseFrequency)) return DEFAULT_BINAURAL_BASE_FREQUENCY;

  return Math.max(MIN_BINAURAL_BASE_FREQUENCY, Math.min(maxBaseFrequency, baseFrequency));
}

export function createBinauralPair(baseFrequency: number, beatFrequency: number): BinauralPair {
  const safeBeatFrequency = normalizeBinauralBeatFrequency(beatFrequency);
  const safeBaseFrequency = normalizeBinauralBaseFrequency(baseFrequency, safeBeatFrequency);

  return {
    baseFrequency: safeBaseFrequency,
    beatFrequency: safeBeatFrequency,
    upperFrequency: safeBaseFrequency + safeBeatFrequency,
    guidance: getBinauralGuidance(safeBeatFrequency),
    baseAdjusted: safeBaseFrequency !== baseFrequency,
    beatAdjusted: safeBeatFrequency !== beatFrequency,
  };
}
