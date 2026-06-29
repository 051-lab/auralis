import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate';
import type { SharedPresetPayload } from '@/store/useAuralisStore';

const COMPRESSED_PRESET_PREFIX = 'v2.';

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
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

function decodeBase64Unicode(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function encodeSharedPreset(payload: SharedPresetPayload): string {
  const compressed = gzipSync(strToU8(JSON.stringify(payload)));
  return `${COMPRESSED_PRESET_PREFIX}${encodeBase64Url(compressed)}`;
}

export function decodeSharedPreset(value: string): SharedPresetPayload {
  if (value.startsWith(COMPRESSED_PRESET_PREFIX)) {
    const compressed = decodeBase64Url(value.slice(COMPRESSED_PRESET_PREFIX.length));
    return JSON.parse(strFromU8(gunzipSync(compressed))) as SharedPresetPayload;
  }

  return JSON.parse(decodeBase64Unicode(value)) as SharedPresetPayload;
}

export function encodeLegacySharedPreset(payload: SharedPresetPayload): string {
  return encodeBase64Unicode(JSON.stringify(payload));
}
