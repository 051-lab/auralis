import type { RecordingMode } from '@/lib/audioEngine';

export type ExportFormat = 'wav' | 'webm';
export type ExportSampleRate = '44.1' | '48';

export function getRecordingModeLabel(mode: RecordingMode): string {
  return mode === 'dry' ? 'Dry Export (limited)' : 'Wet Export (limited)';
}

export function getRecordingModeDescription(mode: RecordingMode): string {
  if (mode === 'dry') {
    return 'Dry export skips reverb and auto-panner, then records through a safety limiter.';
  }

  return 'Wet export includes reverb and auto-panner, then records through the output safety limiter.';
}

export function getRecordingExtension(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export function getTargetSampleRate(exportSampleRate: ExportSampleRate): number {
  return exportSampleRate === '44.1' ? 44100 : 48000;
}

export function encodeWav24(audioBuffer: AudioBuffer): Blob {
  const channelCount = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;
  const bytesPerSample = 3;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: channelCount }, (_, index) =>
    audioBuffer.getChannelData(index)
  );
  let offset = 44;

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame] || 0));
      const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
      const value = Math.round(intSample);

      view.setUint8(offset, value & 0xff);
      view.setUint8(offset + 1, (value >> 8) & 0xff);
      view.setUint8(offset + 2, (value >> 16) & 0xff);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate) return audioBuffer;

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );
  const source = offlineContext.createBufferSource();

  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  return offlineContext.startRendering();
}

export async function createExportBlob(
  recording: Blob,
  exportFormat: ExportFormat,
  exportSampleRate: ExportSampleRate
): Promise<Blob> {
  if (exportFormat !== 'wav') return recording;

  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not available for WAV export');
  }

  const audioContext = new AudioContextConstructor();

  try {
    const decodedBuffer = await audioContext.decodeAudioData(await recording.arrayBuffer());
    const renderedBuffer = await resampleAudioBuffer(
      decodedBuffer,
      getTargetSampleRate(exportSampleRate)
    );

    return encodeWav24(renderedBuffer);
  } finally {
    await audioContext.close();
  }
}
