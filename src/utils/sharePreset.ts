import { Gunzip, gzipSync, strToU8 } from 'fflate';
import type {
  CreatorSessionState,
  MasterFXState,
  ModulationState,
  OscillatorState,
  SharedPresetPayload,
  TextureLayerState,
} from '@/store/useAuralisStore';

const COMPRESSED_PRESET_PREFIX = 'v2.';
export const MAX_SHARED_PRESET_ENCODED_LENGTH = 2_000;
export const MAX_SHARED_PRESET_JSON_BYTES = 32 * 1024;
const CURRENT_SHARED_PRESET_SCHEMA_VERSION = 2;
const GZIP_HEADER_BYTES = 10;
const GZIP_TRAILER_BYTES = 8;
const GUNZIP_INPUT_CHUNK_BYTES = 8;

export type SharedPresetIngestionErrorCode =
  | 'too_large'
  | 'invalid_encoding'
  | 'decompression_limit'
  | 'invalid_json'
  | 'invalid_shape'
  | 'unsupported_version';

export type SharedPresetIngestionResult =
  | { ok: true; payload: SharedPresetPayload }
  | { ok: false; code: SharedPresetIngestionErrorCode };

const waveformTypes = ['sine', 'square', 'sawtooth', 'triangle'] as const;
const noiseTypes = ['white', 'pink', 'brown'] as const;
const modulationModes = ['off', 'gentle', 'breathing', 'pulse', 'drift'] as const;
const textureTypes = ['rain', 'storm', 'wind', 'ocean', 'drone'] as const;

const crc32Table = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isEnumValue<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function limitedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, maxLength);
}

function boundedNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(maximum, Math.max(minimum, value));
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64(value: string, urlSafe: boolean): Uint8Array {
  const validPattern = urlSafe ? /^[A-Za-z0-9_-]+$/ : /^[A-Za-z0-9+/]+={0,2}$/;
  if (!validPattern.test(value) || value.length % 4 === 1) throw new Error('Invalid base64');

  const normalized = urlSafe ? value.replace(/-/g, '+').replace(/_/g, '/') : value;
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '='
  );
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Unicode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeCompressedJson(value: string):
  | { ok: true; json: string }
  | { ok: false; code: SharedPresetIngestionErrorCode } {
  let compressed: Uint8Array;

  try {
    compressed = decodeBase64(value, true);
  } catch {
    return { ok: false, code: 'invalid_encoding' };
  }

  const minimumLength = GZIP_HEADER_BYTES + GZIP_TRAILER_BYTES;
  if (
    compressed.length < minimumLength ||
    compressed[0] !== 0x1f ||
    compressed[1] !== 0x8b ||
    compressed[2] !== 8 ||
    compressed[3] !== 0
  ) {
    return { ok: false, code: 'invalid_encoding' };
  }

  const trailerOffset = compressed.length - GZIP_TRAILER_BYTES;
  const expectedCrc = readUint32LE(compressed, trailerOffset);
  const expectedSize = readUint32LE(compressed, trailerOffset + 4);
  if (expectedSize > MAX_SHARED_PRESET_JSON_BYTES) {
    return { ok: false, code: 'decompression_limit' };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let exceededLimit = false;

  try {
    const gunzip = new Gunzip((chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_SHARED_PRESET_JSON_BYTES) {
        exceededLimit = true;
        throw new Error('Shared preset decompression limit exceeded');
      }
      chunks.push(chunk.slice());
    });

    for (let offset = 0; offset < compressed.length; offset += GUNZIP_INPUT_CHUNK_BYTES) {
      const end = Math.min(offset + GUNZIP_INPUT_CHUNK_BYTES, compressed.length);
      gunzip.push(compressed.subarray(offset, end), end === compressed.length);
    }
  } catch {
    return {
      ok: false,
      code: exceededLimit ? 'decompression_limit' : 'invalid_encoding',
    };
  }

  if (totalBytes !== expectedSize) return { ok: false, code: 'invalid_encoding' };

  const decoded = new Uint8Array(totalBytes);
  let offset = 0;
  chunks.forEach((chunk) => {
    decoded.set(chunk, offset);
    offset += chunk.length;
  });

  if (calculateCrc32(decoded) !== expectedCrc) {
    return { ok: false, code: 'invalid_encoding' };
  }

  try {
    return {
      ok: true,
      json: new TextDecoder('utf-8', { fatal: true }).decode(decoded),
    };
  } catch {
    return { ok: false, code: 'invalid_encoding' };
  }
}

function decodeLegacyJson(value: string):
  | { ok: true; json: string }
  | { ok: false; code: SharedPresetIngestionErrorCode } {
  let bytes: Uint8Array;

  try {
    bytes = decodeBase64(value, false);
  } catch {
    return { ok: false, code: 'invalid_encoding' };
  }

  if (bytes.length > MAX_SHARED_PRESET_JSON_BYTES) {
    return { ok: false, code: 'decompression_limit' };
  }

  try {
    return { ok: true, json: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, code: 'invalid_encoding' };
  }
}

function sanitizeOscillator(value: unknown): Partial<OscillatorState> | undefined {
  if (!isPlainObject(value)) return undefined;
  const result: Partial<OscillatorState> = {};
  const frequency = boundedNumber(value.frequency, 20, 20_000);
  const detuneCents = boundedNumber(value.detuneCents, -1_200, 1_200);
  const gain = boundedNumber(value.gain, 0, 1);
  const pan = boundedNumber(value.pan, -1, 1);
  const phaseDegrees = boundedNumber(value.phaseDegrees, 0, 360);
  const tremoloRate = boundedNumber(value.tremoloRate, 0.1, 30);
  const tremoloDepth = boundedNumber(value.tremoloDepth, 0, 1);
  const attackSeconds = boundedNumber(value.attackSeconds, 0.001, 5);
  const releaseSeconds = boundedNumber(value.releaseSeconds, 0.01, 10);

  if (frequency !== undefined) result.frequency = frequency;
  if (detuneCents !== undefined) result.detuneCents = detuneCents;
  if (gain !== undefined) result.gain = gain;
  if (isEnumValue(value.waveform, waveformTypes)) result.waveform = value.waveform;
  if (pan !== undefined) result.pan = pan;
  if (phaseDegrees !== undefined) result.phaseDegrees = phaseDegrees;
  if (typeof value.muted === 'boolean') result.muted = value.muted;
  if (typeof value.soloed === 'boolean') result.soloed = value.soloed;
  if (typeof value.tremoloEnabled === 'boolean') result.tremoloEnabled = value.tremoloEnabled;
  if (isEnumValue(value.tremoloShape, waveformTypes)) result.tremoloShape = value.tremoloShape;
  if (tremoloRate !== undefined) result.tremoloRate = tremoloRate;
  if (tremoloDepth !== undefined) result.tremoloDepth = tremoloDepth;
  if (attackSeconds !== undefined) result.attackSeconds = attackSeconds;
  if (releaseSeconds !== undefined) result.releaseSeconds = releaseSeconds;
  return result;
}

function sanitizeMasterFX(value: unknown): Partial<MasterFXState> | undefined {
  if (!isPlainObject(value)) return undefined;
  const result: Partial<MasterFXState> = {};
  const numericFields: Array<[keyof MasterFXState, number, number]> = [
    ['masterVolume', 0, 1],
    ['limiterThresholdDb', -12, -0.1],
    ['reverbWet', 0, 1],
    ['reverbDecay', 0.2, 12],
    ['reverbPreDelay', 0, 0.5],
    ['autoPannerRate', 0, 20],
    ['autoPannerDepth', 0, 1],
    ['eqLowGain', -12, 12],
    ['eqMidGain', -12, 12],
    ['eqHighGain', -12, 12],
    ['stereoWidth', 0, 1],
    ['delayWet', 0, 1],
    ['delayTime', 0.01, 1],
    ['delayFeedback', 0, 0.9],
    ['chorusWet', 0, 1],
    ['chorusRate', 0.05, 8],
    ['chorusDepth', 0, 1],
  ];
  numericFields.forEach(([key, minimum, maximum]) => {
    const fieldValue = boundedNumber(value[key], minimum, maximum);
    if (fieldValue !== undefined) Object.assign(result, { [key]: fieldValue });
  });
  (['eqEnabled', 'delayEnabled', 'chorusEnabled'] as const).forEach((key) => {
    if (typeof value[key] === 'boolean') Object.assign(result, { [key]: value[key] });
  });
  return result;
}

function sanitizeModulation(value: unknown): Partial<ModulationState> | undefined {
  if (!isPlainObject(value)) return undefined;
  const result: Partial<ModulationState> = {};
  const rate = boundedNumber(value.rate, 0.01, 1);
  const depth = boundedNumber(value.depth, 0, 1);
  if (isEnumValue(value.mode, modulationModes)) result.mode = value.mode;
  if (rate !== undefined) result.rate = rate;
  if (depth !== undefined) result.depth = depth;
  if (isPlainObject(value.targets)) {
    const sourceTargets = value.targets;
    const targets: ModulationState['targets'] = {
      noiseFilter: true,
      noiseWidth: true,
      oscillatorPan: false,
    };
    (['noiseFilter', 'noiseWidth', 'oscillatorPan'] as const).forEach((key) => {
      if (typeof sourceTargets[key] === 'boolean') targets[key] = sourceTargets[key];
    });
    result.targets = targets;
  }
  return result;
}

function sanitizeTexture(value: unknown): Partial<TextureLayerState> | undefined {
  if (!isPlainObject(value)) return undefined;
  const result: Partial<TextureLayerState> = {};
  if (typeof value.enabled === 'boolean') result.enabled = value.enabled;
  if (isEnumValue(value.type, textureTypes)) result.type = value.type;
  (['gain', 'tone', 'width', 'motion'] as const).forEach((key) => {
    const fieldValue = boundedNumber(value[key], 0, 1);
    if (fieldValue !== undefined) result[key] = fieldValue;
  });
  return result;
}

function sanitizeCreatorSession(value: unknown): Partial<CreatorSessionState> | undefined {
  if (!isPlainObject(value)) return undefined;
  const result: Partial<CreatorSessionState> = {};
  const textFields: Array<[keyof CreatorSessionState, number]> = [
    ['title', 96],
    ['purpose', 80],
    ['notes', 320],
    ['visualTheme', 120],
    ['storyboardNotes', 420],
    ['exportSlug', 96],
  ];
  textFields.forEach(([key, maximum]) => {
    const fieldValue = limitedString(value[key], maximum);
    if (fieldValue !== undefined) Object.assign(result, { [key]: fieldValue });
  });
  const durationMinutes = boundedNumber(value.durationMinutes, 1, 720);
  if (durationMinutes !== undefined) result.durationMinutes = durationMinutes;
  return result;
}

function reconstructPayload(root: Record<string, unknown>): SharedPresetPayload {
  const payload: SharedPresetPayload = { version: CURRENT_SHARED_PRESET_SCHEMA_VERSION };
  const textFields: Array<[keyof SharedPresetPayload, number]> = [
    ['name', 80],
    ['description', 180],
    ['intendedUse', 48],
    ['caution', 160],
  ];
  textFields.forEach(([key, maximum]) => {
    const fieldValue = limitedString(root[key], maximum);
    if (fieldValue !== undefined) Object.assign(payload, { [key]: fieldValue });
  });

  if (typeof root.headphonesRecommended === 'boolean') {
    payload.headphonesRecommended = root.headphonesRecommended;
  }
  if (typeof root.exportReady === 'boolean') payload.exportReady = root.exportReady;
  if (typeof root.noiseEnabled === 'boolean') payload.noiseEnabled = root.noiseEnabled;
  if (isEnumValue(root.noiseType, noiseTypes)) payload.noiseType = root.noiseType;
  if (typeof root.isBinauralMode === 'boolean') payload.isBinauralMode = root.isBinauralMode;
  if (root.binauralPreset === null) payload.binauralPreset = null;
  else {
    const binauralPreset = limitedString(root.binauralPreset, 80);
    if (binauralPreset !== undefined) payload.binauralPreset = binauralPreset;
  }

  const topLevelNumbers: Array<[keyof SharedPresetPayload, number, number]> = [
    ['noiseGain', 0, 1],
    ['noiseHighpassFrequency', 20, 500],
    ['noiseLowpassFrequency', 500, 12_000],
    ['noiseStereoWidth', 0, 1],
    ['createdAt', 0, Number.MAX_SAFE_INTEGER],
  ];
  topLevelNumbers.forEach(([key, minimum, maximum]) => {
    const fieldValue = boundedNumber(root[key], minimum, maximum);
    if (fieldValue !== undefined) Object.assign(payload, { [key]: fieldValue });
  });

  if (Array.isArray(root.tags)) {
    payload.tags = root.tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim().toLowerCase().slice(0, 24))
      .filter(Boolean)
      .filter((tag, index, tags) => tags.indexOf(tag) === index)
      .slice(0, 5);
  }
  if (Array.isArray(root.oscillators)) {
    payload.oscillators = root.oscillators
      .slice(0, 4)
      .map(sanitizeOscillator)
      .filter((oscillator): oscillator is Partial<OscillatorState> => oscillator !== undefined);
  }

  const masterFX = sanitizeMasterFX(root.masterFX);
  if (masterFX) payload.masterFX = masterFX;
  const modulation = sanitizeModulation(root.modulation);
  if (modulation) payload.modulation = modulation;
  const textureLayer = sanitizeTexture(root.textureLayer);
  if (textureLayer) payload.textureLayer = textureLayer;
  const creatorSession = sanitizeCreatorSession(root.creatorSession);
  if (creatorSession) payload.creatorSession = creatorSession;
  return payload;
}

export function encodeSharedPreset(payload: SharedPresetPayload): string {
  const compressed = gzipSync(strToU8(JSON.stringify(payload)));
  return `${COMPRESSED_PRESET_PREFIX}${encodeBase64Url(compressed)}`;
}

export function ingestSharedPreset(value: string): SharedPresetIngestionResult {
  if (!value || value.length > MAX_SHARED_PRESET_ENCODED_LENGTH) {
    return { ok: false, code: 'too_large' };
  }

  const decoded = value.startsWith(COMPRESSED_PRESET_PREFIX)
    ? decodeCompressedJson(value.slice(COMPRESSED_PRESET_PREFIX.length))
    : decodeLegacyJson(value);
  if (!decoded.ok) return decoded;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded.json);
  } catch {
    return { ok: false, code: 'invalid_json' };
  }

  if (!isPlainObject(parsed)) return { ok: false, code: 'invalid_shape' };

  const version = parsed.version;
  if (
    version !== undefined &&
    (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 2)
  ) {
    return { ok: false, code: 'unsupported_version' };
  }

  return { ok: true, payload: reconstructPayload(parsed) };
}

export function decodeSharedPreset(value: string): SharedPresetPayload {
  const result = ingestSharedPreset(value);
  if (!result.ok) throw new Error(`Shared preset rejected: ${result.code}`);
  return result.payload;
}

export function encodeLegacySharedPreset(payload: SharedPresetPayload): string {
  return encodeBase64Unicode(JSON.stringify(payload));
}
