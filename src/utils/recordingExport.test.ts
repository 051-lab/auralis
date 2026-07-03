import { describe, expect, it } from 'vitest';
import {
  encodeWav24,
  getRecordingExtension,
  getRecordingModeDescription,
  getRecordingModeLabel,
  getTargetSampleRate,
} from './recordingExport';

function createMockAudioBuffer(): AudioBuffer {
  const left = new Float32Array([0, 0.5, -0.5, 1]);
  const right = new Float32Array([0, -0.25, 0.25, -1]);

  return {
    numberOfChannels: 2,
    length: left.length,
    sampleRate: 48000,
    duration: left.length / 48000,
    getChannelData: (index: number) => (index === 0 ? left : right),
  } as AudioBuffer;
}

describe('recording export helpers', () => {
  it('labels wet and dry recording modes clearly', () => {
    expect(getRecordingModeLabel('wet')).toBe('Wet Export (limited)');
    expect(getRecordingModeLabel('dry')).toBe('Dry Export (limited)');
    expect(getRecordingModeDescription('dry')).toContain('safety limiter');
  });

  it('maps mime types to export extensions', () => {
    expect(getRecordingExtension('audio/wav')).toBe('wav');
    expect(getRecordingExtension('audio/mpeg')).toBe('mp3');
    expect(getRecordingExtension('audio/ogg; codecs=opus')).toBe('ogg');
    expect(getRecordingExtension('audio/webm; codecs=opus')).toBe('webm');
  });

  it('maps export sample-rate labels', () => {
    expect(getTargetSampleRate('44.1')).toBe(44100);
    expect(getTargetSampleRate('48')).toBe(48000);
  });

  it('encodes a 24-bit WAV header and payload', async () => {
    const wavBlob = encodeWav24(createMockAudioBuffer());
    const bytes = new Uint8Array(await wavBlob.arrayBuffer());
    const text = new TextDecoder().decode(bytes.slice(0, 12));

    expect(wavBlob.type).toBe('audio/wav');
    expect(text).toContain('RIFF');
    expect(text).toContain('WAVE');
    expect(bytes.byteLength).toBe(44 + 4 * 2 * 3);
  });
});
