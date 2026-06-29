import * as Tone from 'tone';
import { clamp } from '@/utils/math';

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type NoiseType = 'white' | 'pink' | 'brown';
export type RecordingMode = 'wet' | 'dry';

export interface OscillatorConfig {
  index: number;
  frequency: number;
  gain: number;
  waveform: WaveformType;
  pan: number;
  tremoloEnabled: boolean;
  tremoloRate: number;
  tremoloDepth: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __auralisAudioEngine: AudioEngine | undefined;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private oscillators: Tone.Oscillator[] = [];
  private oscillatorGains: Tone.Gain[] = [];
  private oscillatorPanners: Tone.Panner[] = [];
  private tremoloLFOs: Tone.LFO[] = [];
  private tremoloGains: Tone.Gain[] = [];
  private oscillatorGainValues: number[] = [];
  private tremoloDepthValues: number[] = [];
  private tremoloEnabledStates: boolean[] = [];

  private masterGain: Tone.Gain;
  private userVolume: Tone.Gain;
  private transportFade: Tone.Volume;
  private reverb: Tone.Reverb;
  private autoPanner: Tone.AutoPanner;
  private limiter: Tone.Limiter;
  private analyser: Tone.Analyser;
  private wetRecorder: Tone.Recorder;
  private dryRecorder: Tone.Recorder;
  private activeRecorder: Tone.Recorder | null = null;
  private activeRecordingMode: RecordingMode = 'wet';

  private noise: Tone.Noise;
  private noiseGain: Tone.Gain;
  private noiseStarted = false;
  private currentNoiseType: NoiseType = 'brown';
  private currentNoiseGain = 0.2;

  private isStarted = false;
  private oscillatorSourcesStarted = false;
  private isRecording = false;
  private fadeToken = 0;

  private constructor() {
    this.masterGain = new Tone.Gain(0.8);
    this.userVolume = new Tone.Gain(0.6);
    this.transportFade = new Tone.Volume(-Infinity);
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.3 });
    this.autoPanner = new Tone.AutoPanner({ frequency: 0.2, depth: 0.5 });
    this.limiter = new Tone.Limiter(-1);
    this.analyser = new Tone.Analyser('waveform', 2048);
    this.wetRecorder = new Tone.Recorder();
    this.dryRecorder = new Tone.Recorder();

    this.noise = new Tone.Noise(this.currentNoiseType);
    this.noiseGain = new Tone.Gain(0);

    this.masterGain.connect(this.userVolume);
    this.userVolume.connect(this.transportFade);
    this.transportFade.connect(this.reverb);
    this.transportFade.connect(this.dryRecorder);
    this.reverb.connect(this.autoPanner);
    this.autoPanner.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(Tone.Destination);
    this.limiter.connect(this.wetRecorder);

    this.noise.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    for (let i = 0; i < 4; i += 1) {
      this.createOscillatorChannel(i);
    }
  }

  public static getInstance(): AudioEngine {
    if (process.env.NODE_ENV !== 'production' && globalThis.__auralisAudioEngine) {
      AudioEngine.instance = globalThis.__auralisAudioEngine;
      return globalThis.__auralisAudioEngine;
    }

    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();

      if (process.env.NODE_ENV !== 'production') {
        globalThis.__auralisAudioEngine = AudioEngine.instance;
      }
    }

    return AudioEngine.instance;
  }

  private createOscillatorChannel(index: number): void {
    const oscillator = new Tone.Oscillator({
      type: 'sine',
      frequency: 200 + index * 100,
      volume: 0,
    });

    const panner = new Tone.Panner(0);
    const gain = new Tone.Gain(0.5);
    const tremoloGain = new Tone.Gain(1);
    const lfo = new Tone.LFO({ frequency: 2, min: 0.7, max: 1 });

    oscillator.connect(panner);
    panner.connect(gain);
    gain.connect(tremoloGain);
    tremoloGain.connect(this.masterGain);

    this.oscillators[index] = oscillator;
    this.oscillatorPanners[index] = panner;
    this.oscillatorGains[index] = gain;
    this.tremoloGains[index] = tremoloGain;
    this.tremoloLFOs[index] = lfo;
    this.oscillatorGainValues[index] = 0.5;
    this.tremoloDepthValues[index] = 0.3;
    this.tremoloEnabledStates[index] = false;
  }

  public async start(): Promise<void> {
    await Tone.start();

    if (!this.oscillatorSourcesStarted) {
      this.oscillators.forEach((oscillator) => {
        oscillator.start();
      });
      this.oscillatorSourcesStarted = true;
    }

    this.fadeToken += 1;
    this.transportFade.volume.cancelScheduledValues(Tone.now());
    this.transportFade.volume.rampTo(0, 0.05);
    this.isStarted = true;
  }

  public stop(): void {
    if (!this.isStarted) return;

    this.fadeToken += 1;
    this.transportFade.volume.cancelScheduledValues(Tone.now());
    this.transportFade.volume.rampTo(-Infinity, 0.25);
    this.stopNoise();
    this.isStarted = false;
  }

  public async fadeOutAndStop(duration: number = 10): Promise<void> {
    if (!this.isStarted) return;

    const token = this.fadeToken + 1;
    this.fadeToken = token;
    this.transportFade.volume.cancelScheduledValues(Tone.now());
    this.transportFade.volume.rampTo(-Infinity, duration);
    this.stopNoise();

    await new Promise((resolve) => {
      window.setTimeout(resolve, duration * 1000);
    });

    if (this.fadeToken === token) {
      this.isStarted = false;
    }
  }

  public async startRecording(mode: RecordingMode = 'wet'): Promise<void> {
    if (this.isRecording) return;

    this.activeRecordingMode = mode;
    this.activeRecorder = mode === 'dry' ? this.dryRecorder : this.wetRecorder;
    this.activeRecorder.start();
    this.isRecording = true;
  }

  public async stopRecording(): Promise<Blob> {
    if (!this.isRecording || !this.activeRecorder) {
      throw new Error('Not recording');
    }

    const recording = await this.activeRecorder.stop();
    this.activeRecorder = null;
    this.isRecording = false;
    return recording;
  }

  public getRecordingMode(): RecordingMode {
    return this.activeRecordingMode;
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public setMasterVolume(volume: number): void {
    this.userVolume.gain.rampTo(clamp(volume, 0, 1), 0.05);
  }

  public setFrequency(index: number, freq: number): void {
    const oscillator = this.oscillators[index];
    if (!oscillator) return;

    oscillator.frequency.rampTo(clamp(freq, 20, 20000), 0.05);
  }

  public setGain(index: number, gain: number): void {
    const oscillatorGain = this.oscillatorGains[index];
    if (!oscillatorGain) return;

    const safeGain = clamp(gain, 0, 1);
    this.oscillatorGainValues[index] = safeGain;
    oscillatorGain.gain.rampTo(safeGain, 0.05);
  }

  public setWaveform(index: number, waveform: WaveformType): void {
    const oscillator = this.oscillators[index];
    if (!oscillator) return;

    oscillator.type = waveform;
  }

  public setPan(index: number, pan: number): void {
    const panner = this.oscillatorPanners[index];
    if (!panner) return;

    panner.pan.rampTo(clamp(pan, -1, 1), 0.05);
  }

  public setTremoloEnabled(index: number, enabled: boolean): void {
    const lfo = this.tremoloLFOs[index];
    const tremoloGain = this.tremoloGains[index];

    if (!lfo || !tremoloGain) return;
    if (this.tremoloEnabledStates[index] === enabled) return;

    if (enabled) {
      this.configureTremoloRange(index);
      lfo.connect(tremoloGain.gain);
      lfo.start();
      this.tremoloEnabledStates[index] = true;
      return;
    }

    lfo.stop();
    lfo.disconnect();
    tremoloGain.gain.cancelScheduledValues(Tone.now());
    tremoloGain.gain.rampTo(1, 0.05);
    this.tremoloEnabledStates[index] = false;
  }

  public setTremoloRate(index: number, rate: number): void {
    const lfo = this.tremoloLFOs[index];
    if (!lfo) return;

    lfo.frequency.rampTo(clamp(rate, 0.1, 30), 0.05);
  }

  public setTremoloDepth(index: number, depth: number): void {
    this.tremoloDepthValues[index] = clamp(depth, 0, 1);
    this.configureTremoloRange(index);
  }

  private configureTremoloRange(index: number): void {
    const lfo = this.tremoloLFOs[index];
    if (!lfo) return;

    const depth = this.tremoloDepthValues[index] ?? 0;
    lfo.min = 1 - depth;
    lfo.max = 1;
  }

  public setReverbWet(wet: number): void {
    this.reverb.wet.rampTo(clamp(wet, 0, 1), 0.05);
  }

  public setReverbDecay(decay: number): void {
    this.reverb.decay = clamp(decay, 0.2, 12);
    this.reverb.generate();
  }

  public setAutoPannerRate(rate: number): void {
    this.autoPanner.frequency.rampTo(clamp(rate, 0, 20), 0.05);
  }

  public setAutoPannerDepth(depth: number): void {
    this.autoPanner.depth.rampTo(clamp(depth, 0, 1), 0.05);
  }

  public setNoiseType(type: NoiseType): void {
    this.currentNoiseType = type;
    this.noise.type = type;
  }

  public setNoiseGain(gain: number): void {
    this.currentNoiseGain = clamp(gain, 0, 1);

    if (this.isStarted && this.noiseStarted) {
      this.noiseGain.gain.rampTo(this.currentNoiseGain, 0.05);
    }
  }

  public startNoise(): void {
    if (!this.noiseStarted) {
      this.noise.start();
      this.noiseStarted = true;
    }

    this.noiseGain.gain.rampTo(this.currentNoiseGain, 0.05);
  }

  public stopNoise(): void {
    this.noiseGain.gain.rampTo(0, 0.05);
  }

  public getAnalyser(): Tone.Analyser {
    return this.analyser;
  }

  public isRunning(): boolean {
    return this.isStarted;
  }
}

export const getAudioEngine = (): AudioEngine => AudioEngine.getInstance();
