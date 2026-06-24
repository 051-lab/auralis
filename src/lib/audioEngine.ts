import * as Tone from 'tone';

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

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

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  
  private context: Tone.Context | null = null;
  private oscillators: Tone.Oscillator[] = [];
  private oscillatorGains: Tone.Gain[] = [];
  private oscillatorPanners: Tone.Panner[] = [];
  private tremoloLFOs: Tone.LFO[] = [];
  private tremoloGains: Tone.Gain[] = [];
  
  private masterGain: Tone.Gain;
  private reverb: Tone.Reverb;
  private autoPanner: Tone.AutoPanner;
  private analyser: Tone.Analyser;
  
  private isStarted = false;

  private constructor() {
    this.masterGain = new Tone.Gain(0.8);
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.3 });
    this.autoPanner = new Tone.AutoPanner({ frequency: 0.2, depth: 0.5 });
    this.analyser = new Tone.Analyser('waveform', 2048);
    
    // Connect master chain: masterGain -> reverb -> autoPanner -> analyser -> destination
    this.masterGain.connect(this.reverb);
    this.reverb.connect(this.autoPanner);
    this.autoPanner.connect(this.analyser);
    this.analyser.connect(Tone.Destination);
    
    // Initialize 4 oscillator channels
    for (let i = 0; i < 4; i++) {
      this.createOscillatorChannel(i);
    }
  }

  private createOscillatorChannel(index: number) {
    const oscillator = new Tone.Oscillator({
      type: 'sine',
      frequency: 200 + index * 100,
      volume: -Infinity,
    });

    const gain = new Tone.Gain(0.5);
    const panner = new Tone.Panner(0);
    
    // Tremolo LFO setup
    const lfo = new Tone.LFO({ frequency: 2, min: 0, max: 1 });
    const tremoloGain = new Tone.Gain(0.3);
    
    // LFO -> tremoloGain -> oscillator gain modulation
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
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async start(): Promise<void> {
    if (this.isStarted) return;
    await Tone.start();
    this.context = Tone.getContext();
    this.oscillators.forEach(osc => osc.start());
    this.isStarted = true;
  }

  public stop(): void {
    this.oscillators.forEach(osc => osc.stop());
    this.isStarted = false;
  }

  public setFrequency(index: number, freq: number): void {
    if (this.oscillators[index]) {
      this.oscillators[index].frequency.rampTo(freq, 0.05);
    }
  }

  public setGain(index: number, gain: number): void {
    if (this.oscillatorGains[index]) {
      this.oscillatorGains[index].gain.rampTo(gain, 0.05);
    }
  }

  public setWaveform(index: number, waveform: WaveformType): void {
    if (this.oscillators[index]) {
      this.oscillators[index].type = waveform;
    }
  }

  public setPan(index: number, pan: number): void {
    if (this.oscillatorPanners[index]) {
      this.oscillatorPanners[index].pan.rampTo(pan, 0.05);
    }
  }

  public setTremoloEnabled(index: number, enabled: boolean): void {
    if (this.tremoloLFOs[index] && this.tremoloGains[index]) {
      if (enabled) {
        this.tremoloLFOs[index].start();
      } else {
        this.tremoloLFOs[index].stop();
        this.oscillatorGains[index].gain.cancelScheduledValues(0);
        this.oscillatorGains[index].gain.setValueAtTime(0.5, 0);
      }
    }
  }

  public setTremoloRate(index: number, rate: number): void {
    if (this.tremoloLFOs[index]) {
      this.tremoloLFOs[index].frequency.rampTo(rate, 0.05);
    }
  }

  public setTremoloDepth(index: number, depth: number): void {
    if (this.tremoloGains[index]) {
      this.tremoloGains[index].gain.rampTo(depth, 0.05);
    }
  }

  public setReverbWet(wet: number): void {
    this.reverb.wet.rampTo(wet, 0.05);
  }

  public setAutoPannerRate(rate: number): void {
    this.autoPanner.frequency.rampTo(rate, 0.05);
  }

  public setAutoPannerDepth(depth: number): void {
    this.autoPanner.depth.rampTo(depth, 0.05);
  }

  public getAnalyser(): Tone.Analyser {
    return this.analyser;
  }

  public isRunning(): boolean {
    return this.isStarted;
  }
}

export const getAudioEngine = (): AudioEngine => AudioEngine.getInstance();
