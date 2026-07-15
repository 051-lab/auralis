import { gzipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { SharedPresetPayload } from '@/store/useAuralisStore';
import {
  MAX_SHARED_PRESET_ENCODED_LENGTH,
  decodeSharedPreset,
  encodeLegacySharedPreset,
  encodeSharedPreset,
  ingestSharedPreset,
} from './sharePreset';

const payload: SharedPresetPayload = {
  version: 2,
  name: 'Share Test',
  description: 'Shared preset metadata test.',
  intendedUse: 'Test session',
  headphonesRecommended: true,
  exportReady: true,
  caution: 'Use a low volume.',
  tags: ['test', 'metadata'],
  oscillators: [{ frequency: 528, gain: 0.4, pan: -1 }],
  masterFX: {
    masterVolume: 0.6,
    reverbWet: 0.1,
    reverbDecay: 6,
    autoPannerRate: 0,
    autoPannerDepth: 0,
  },
  noiseEnabled: true,
  noiseType: 'brown',
  noiseGain: 0.1,
  noiseHighpassFrequency: 40,
  noiseLowpassFrequency: 6400,
  noiseStereoWidth: 0.65,
  modulation: {
    mode: 'gentle',
    rate: 0.08,
    depth: 0.25,
    targets: { noiseFilter: true, noiseWidth: true, oscillatorPan: false },
  },
  textureLayer: { enabled: true, type: 'rain', gain: 0.08, tone: 0.5, width: 0.7, motion: 0.2 },
  creatorSession: {
    title: 'Share Test',
    purpose: 'Test session',
    notes: 'Round trip the creator fields.',
    visualTheme: 'Cyan test ring',
    storyboardNotes: 'Hold on the visualizer center.',
    durationMinutes: 45,
    exportSlug: 'share-test-session',
  },
  createdAt: 1,
};

function encodeCompressedBytes(bytes: Uint8Array): string {
  const compressed = gzipSync(bytes);
  let binary = '';
  compressed.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `v2.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

function encodeRawCompressed(value: unknown): string {
  return encodeCompressedBytes(strToU8(JSON.stringify(value)));
}

function encodeExistingGzip(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `v2.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

describe('share preset ingestion', () => {
  it('round-trips compressed schema-v2 presets', () => {
    const encoded = encodeSharedPreset(payload);
    expect(encoded.startsWith('v2.')).toBe(true);
    expect(ingestSharedPreset(encoded)).toEqual({ ok: true, payload });
    expect(decodeSharedPreset(encoded)).toEqual(payload);
  });

  it('migrates legacy and missing-version payloads to schema v2', () => {
    const v1 = { ...payload, version: 1 };
    const versionless = { ...payload } as Record<string, unknown>;
    delete versionless.version;

    expect(ingestSharedPreset(encodeLegacySharedPreset(v1))).toEqual({
      ok: true,
      payload,
    });
    expect(ingestSharedPreset(encodeRawCompressed(versionless))).toEqual({
      ok: true,
      payload,
    });
  });

  it('rejects empty and oversized encoded input', () => {
    expect(ingestSharedPreset('')).toEqual({ ok: false, code: 'too_large' });
    expect(ingestSharedPreset('a'.repeat(MAX_SHARED_PRESET_ENCODED_LENGTH + 1))).toEqual({
      ok: false,
      code: 'too_large',
    });
  });

  it('rejects malformed encodings, gzip, and JSON', () => {
    expect(ingestSharedPreset('v2.not-valid-base64!')).toEqual({
      ok: false,
      code: 'invalid_encoding',
    });
    expect(ingestSharedPreset('v2.YWJj')).toEqual({ ok: false, code: 'invalid_encoding' });
    expect(ingestSharedPreset(btoa('{broken'))).toEqual({ ok: false, code: 'invalid_json' });
  });

  it('rejects high-ratio decompression bombs before retaining their output', () => {
    const bomb = gzipSync(strToU8(JSON.stringify({ version: 2, name: 'a'.repeat(1024 * 1024) })));
    const trailerSizeOffset = bomb.length - 4;
    bomb[trailerSizeOffset] = 1;
    bomb[trailerSizeOffset + 1] = 0;
    bomb[trailerSizeOffset + 2] = 0;
    bomb[trailerSizeOffset + 3] = 0;
    const encoded = encodeExistingGzip(bomb);
    expect(encoded.length).toBeLessThan(MAX_SHARED_PRESET_ENCODED_LENGTH);
    expect(ingestSharedPreset(encoded)).toEqual({
      ok: false,
      code: 'decompression_limit',
    });
  });

  it('rejects truncated gzip data and corrupt CRC trailers', () => {
    const valid = gzipSync(strToU8(JSON.stringify(payload)));
    const truncated = valid.slice(0, -4);
    const corruptCrc = valid.slice();
    const corruptBody = valid.slice();
    corruptCrc[corruptCrc.length - 8] ^= 0xff;
    corruptBody[Math.floor(corruptBody.length / 2)] ^= 0x01;

    expect(ingestSharedPreset(encodeExistingGzip(truncated)).ok).toBe(false);
    expect(ingestSharedPreset(encodeExistingGzip(corruptCrc))).toEqual({
      ok: false,
      code: 'invalid_encoding',
    });
    expect(ingestSharedPreset(encodeExistingGzip(corruptBody))).toEqual({
      ok: false,
      code: 'invalid_encoding',
    });
  });

  it('rejects invalid UTF-8 in compressed payloads', () => {
    const invalidUtf8 = new Uint8Array([
      ...strToU8('{"version":2,"name":"'),
      0xc3,
      0x28,
      ...strToU8('"}'),
    ]);
    expect(ingestSharedPreset(encodeCompressedBytes(invalidUtf8))).toEqual({
      ok: false,
      code: 'invalid_encoding',
    });
  });

  it('rejects non-object roots and unsupported schema versions', () => {
    for (const root of [null, [], 'preset', 4]) {
      expect(ingestSharedPreset(encodeRawCompressed(root))).toEqual({
        ok: false,
        code: 'invalid_shape',
      });
    }

    for (const version of [-1, 0, 1.5, 3, '2']) {
      expect(ingestSharedPreset(encodeRawCompressed({ version }))).toEqual({
        ok: false,
        code: 'unsupported_version',
      });
    }
  });

  it('keeps only recognized fields and bounds collections', () => {
    const encoded = encodeRawCompressed({
      ...payload,
      unknown: 'discard me',
      tags: ['one', 'two', 'three', 'four', 'five', 'six'],
      oscillators: Array.from({ length: 6 }, (_, index) => ({
        frequency: 200 + index,
        injected: true,
      })),
      masterFX: { masterVolume: 0.5, injected: true },
      modulation: {
        mode: 'gentle',
        injected: true,
        targets: { noiseFilter: true, injected: true },
      },
    });
    const result = ingestSharedPreset(encoded);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).not.toHaveProperty('unknown');
    expect(result.payload.tags).toHaveLength(5);
    expect(result.payload.oscillators).toHaveLength(4);
    expect(result.payload.oscillators?.[0]).not.toHaveProperty('injected');
    expect(result.payload.masterFX).not.toHaveProperty('injected');
    expect(result.payload.modulation).not.toHaveProperty('injected');
    expect(result.payload.modulation?.targets).not.toHaveProperty('injected');
  });

  it('sanitizes scalar types, enum values, text lengths, and numeric ranges', () => {
    const result = ingestSharedPreset(
      encodeRawCompressed({
        version: 2,
        name: 42,
        description: 'd'.repeat(300),
        headphonesRecommended: 'yes',
        tags: [' Calm ', 'calm', 3, 'x'.repeat(40)],
        oscillators: [
          {
            frequency: 90_000,
            gain: 'loud',
            waveform: 'noise',
            pan: -4,
            muted: 'false',
            tremoloShape: 'triangle',
          },
        ],
        masterFX: {
          masterVolume: 4,
          limiterThresholdDb: Number.NaN,
          reverbDecay: -1,
          eqEnabled: 'true',
        },
        noiseType: 'blue',
        noiseGain: -3,
        modulation: {
          mode: 'extreme',
          rate: 9,
          targets: { noiseFilter: 'yes', noiseWidth: true },
        },
        textureLayer: { enabled: 'yes', type: 'fire', gain: 3 },
        creatorSession: { title: 't'.repeat(120), durationMinutes: 10_000 },
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.name).toBeUndefined();
    expect(result.payload.description).toHaveLength(180);
    expect(result.payload.headphonesRecommended).toBeUndefined();
    expect(result.payload.tags).toEqual(['calm', 'x'.repeat(24)]);
    expect(result.payload.oscillators).toEqual([
      { frequency: 20_000, pan: -1, tremoloShape: 'triangle' },
    ]);
    expect(result.payload.masterFX).toEqual({ masterVolume: 1, reverbDecay: 0.2 });
    expect(result.payload.noiseType).toBeUndefined();
    expect(result.payload.noiseGain).toBe(0);
    expect(result.payload.modulation).toEqual({
      rate: 1,
      targets: { noiseFilter: true, noiseWidth: true, oscillatorPan: false },
    });
    expect(result.payload.textureLayer).toEqual({ gain: 1 });
    expect(result.payload.creatorSession).toEqual({
      title: 't'.repeat(96),
      durationMinutes: 720,
    });
  });
});
