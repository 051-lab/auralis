import * as Tone from 'tone';

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type NoiseType = 'white' | 'pink' | 'brown';

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

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private oscillators: Tone.Oscillator[] = [];
  private oscillatorGains: Tone.Gain[] = [];
  private oscillatorPanners: Tone.Panner[] = [];
  private tremoloLFOs: Tone.LFO[] = [];
  private tremoloGains: Tone.Gain[] = [];
  private oscillatorGainValues: number[] = [];
  private tremoloEnabledStates: boolean[] = [];

  private masterGain: Tone.Gain;
  private masterVolume: Tone.Volume;
  private reverb: Tone.Reverb;
  private autoPanner: Tone.AutoPanner;
  private analyser: Tone.Analyser;
  private recorder: Tone.Recorder;

  private noise: Tone.Noise;
  private noiseGain: Tone.Gain;
  private noiseStarted = false;
  private currentNoiseType: NoiseType = 'brown';
  private currentNoiseGain = 0.2;

  private isStarted = false;
  private oscillatorSourcesStarted = false;
  private isRecording = false;

  private constructor() {
    this.masterGain = new Tone.Gain(0.8);
    this.masterVolume = new Tone.Volume(-Infinity);
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.3 });
    this.autoPanner = new Tone.AutoPanner({ frequency: 0.2, depth: 0.5 });
    this.analyser = new Tone.Analyser('waveform', 2048);
    this.recorder = new Tone.Recorder();

    this.noise = new Tone.Noise(this.currentNoiseType);
    this.noiseGain = new Tone.Gain(0);

    this.masterGain.connect(this.masterVolume);
    this.masterVolume.connect(this.reverb);
    this.reverb.connect(this.autoPanner);
    this.autoPanner.connect(this.analyser);
    this.analyser.connect(Tone.Destination);

    this.autoPanner.connect(this.recorder);

    this.noise.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    for (let i = 0; i < 4; i += 1) {
      this.createOscillatorChannel(i);
    }
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }

    return AudioEngine.instance;
  }

  private createOscillatorChannel(index: number): void {
    const oscillator = new Tone.Oscillator({
      type: 'sine',
      frequency: 200 + index * 100,
      volume: 0,
    });

    const gain = new Tone.Gain(0.5);
    const panner = new Tone.Panner(0);

    const lfo = new Tone.LFO({ frequency: 2, min: 0, max: 1 });
    const tremoloGain = new Tone.Gain(0.3);

    lfo.connect(tremoloGain);
    tremoloGain.connect(gain.gain);

    oscillator.connect(panner);
    panner.connect(gain);
    gain.connect(this.masterGain);

    this.oscillators[index] = oscillator;
    this.oscillatorGains[index] = gain;
    this.oscillatorPanners[index] = panner;
    this.tremoloLFOs[index] = lfo;
    this.tremoloGains[index] = tremoloGain;
    this.oscillatorGainValues[index] = 0.5;
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

    this.masterVolume.volume.cancelScheduledValues(Tone.now());
    this.masterVolume.volume.rampTo(0, 0.05);
    this.isStarted = true;
  }

  public stop(): void {
    if (!this.isStarted) return;

    this.masterVolume.volume.cancelScheduledValues(Tone.now());
    this.masterVolume.volume.rampTo(-Infinity, 0.25);
    this.stopNoise();
    this.isStarted = false;
  }

  public async fadeOutAndStop(duration: number = 10): Promise<void> {
    if (!this.isStarted) return;

    this.masterVolume.volume.cancelScheduledValues(Tone.now());
    this.masterVolume.volume.rampTo(-Infinity, duration);
    this.stopNoise();

    await new Promise((resolve) => {
      window.setTimeout(resolve, duration * 1000);
    });

    this.isStarted = false;
  }

  public async startRecording(): Promise<void> {
    if (this.isRecording) return;

    this.recorder.start();
    this.isRecording = true;
  }

  public async stopRecording(): Promise<Blob> {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    const recording = await this.recorder.stop();
    this.isRecording = false;
    return recording;
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public setMasterVolume(volume: number): void {
    const safeVolume = clamp(volume, 0, 1);
    this.masterVolume.volume.rampTo(Tone.gainToDb(safeVolume), 0.05);
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
    const oscillatorGain = this.oscillatorGains[index];

    if (!lfo || !oscillatorGain) return;
    if (this.tremoloEnabledStates[index] === enabled) return;

    if (enabled) {
      lfo.start();
      this.tremoloEnabledStates[index] = true;
      return;
    }

    lfo.stop();
    oscillatorGain.gain.cancelScheduledValues(Tone.now());
    oscillatorGain.gain.rampTo(this.oscillatorGainValues[index] ?? 0.5, 0.05);
    this.tremoloEnabledStates[index] = false;
  }

  public setTremoloRate(index: number, rate: number): void {
    const lfo = this.tremoloLFOs[index];
    if (!lfo) return;

    lfo.frequency.rampTo(clamp(rate, 0.1, 30), 0.05);
  }

  public setTremoloDepth(index: number, depth: number): void {
    const tremoloGain = this.tremoloGains[index];
    if (!tremoloGain) return;

    tremoloGain.gain.rampTo(clamp(depth, 0, 1), 0.05);
  }

  public setReverbWet(wet: number): void {
    this.reverb.wet.rampTo(clamp(wet, 0, 1), 0.05);
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
