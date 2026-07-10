import { describe, expect, it, vi } from 'vitest';

const toneMock = vi.hoisted(() => ({
  constructed: [] as string[],
}));

vi.mock('tone', () => {
  class MockParam {
    value: number;

    constructor(value: number = 0) {
      this.value = value;
    }

    rampTo = vi.fn((value: number) => {
      this.value = value;
    });

    cancelScheduledValues = vi.fn();
  }

  class MockNode {
    connect = vi.fn((destination?: unknown) => destination);
    disconnect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
  }

  const track = (name: string) => {
    toneMock.constructed.push(name);
  };

  class Gain extends MockNode {
    gain: MockParam;

    constructor(value: number = 1) {
      super();
      track('Gain');
      this.gain = new MockParam(value);
    }
  }

  class Volume extends MockNode {
    volume: MockParam;

    constructor(value: number = 0) {
      super();
      track('Volume');
      this.volume = new MockParam(value);
    }
  }

  class Oscillator extends MockNode {
    frequency: MockParam;
    detune = new MockParam(0);
    type = 'sine';
    phase = 0;

    constructor(options: { frequency?: number; type?: string } = {}) {
      super();
      track('Oscillator');
      this.frequency = new MockParam(options.frequency ?? 0);
      this.type = options.type ?? 'sine';
    }
  }

  class Panner extends MockNode {
    pan: MockParam;

    constructor(value: number = 0) {
      super();
      track('Panner');
      this.pan = new MockParam(value);
    }
  }

  class LFO extends MockNode {
    frequency: MockParam;
    min: number;
    max: number;
    type = 'sine';

    constructor(options: { frequency?: number; min?: number; max?: number } = {}) {
      super();
      track('LFO');
      this.frequency = new MockParam(options.frequency ?? 0);
      this.min = options.min ?? 0;
      this.max = options.max ?? 1;
    }
  }

  class Reverb extends MockNode {
    wet: MockParam;
    decay: number;
    preDelay = 0;
    generate = vi.fn();

    constructor(options: { wet?: number; decay?: number } = {}) {
      super();
      track('Reverb');
      this.wet = new MockParam(options.wet ?? 0);
      this.decay = options.decay ?? 1;
    }
  }

  class AutoPanner extends MockNode {
    frequency: MockParam;
    depth: MockParam;

    constructor(options: { frequency?: number; depth?: number } = {}) {
      super();
      track('AutoPanner');
      this.frequency = new MockParam(options.frequency ?? 0);
      this.depth = new MockParam(options.depth ?? 0);
    }
  }

  class EQ3 extends MockNode {
    low: MockParam;
    mid: MockParam;
    high: MockParam;

    constructor(options: { low?: number; mid?: number; high?: number } = {}) {
      super();
      track('EQ3');
      this.low = new MockParam(options.low ?? 0);
      this.mid = new MockParam(options.mid ?? 0);
      this.high = new MockParam(options.high ?? 0);
    }
  }

  class FeedbackDelay extends MockNode {
    wet: MockParam;
    delayTime: MockParam;
    feedback: MockParam;

    constructor(options: { wet?: number; delayTime?: number; feedback?: number } = {}) {
      super();
      track('FeedbackDelay');
      this.wet = new MockParam(options.wet ?? 0);
      this.delayTime = new MockParam(options.delayTime ?? 0);
      this.feedback = new MockParam(options.feedback ?? 0);
    }
  }

  class Chorus extends MockNode {
    wet: MockParam;
    frequency: MockParam;
    depth: number;

    constructor(options: { wet?: number; frequency?: number; depth?: number } = {}) {
      super();
      track('Chorus');
      this.wet = new MockParam(options.wet ?? 0);
      this.frequency = new MockParam(options.frequency ?? 0);
      this.depth = options.depth ?? 0;
    }
  }

  class StereoWidener extends MockNode {
    width: MockParam;

    constructor(width: number = 0.5) {
      super();
      track('StereoWidener');
      this.width = new MockParam(width);
    }
  }

  class Limiter extends MockNode {
    threshold: MockParam;
    reduction = 0;

    constructor(threshold: number = -1) {
      super();
      track('Limiter');
      this.threshold = new MockParam(threshold);
    }
  }

  class Analyser extends MockNode {
    constructor() {
      super();
      track('Analyser');
    }

    getValue = vi.fn(() => new Float32Array([0, 0.25, -0.5, 0.125]));
  }

  class Recorder extends MockNode {
    constructor() {
      super();
      track('Recorder');
    }

    stop = vi.fn(async () => new Blob(['mock-recording']));
  }

  class Noise extends MockNode {
    type: string;

    constructor(type: string = 'brown') {
      super();
      track('Noise');
      this.type = type;
    }
  }

  class Filter extends MockNode {
    frequency: MockParam;
    type: string;

    constructor(options: { frequency?: number; type?: string } = {}) {
      super();
      track('Filter');
      this.frequency = new MockParam(options.frequency ?? 0);
      this.type = options.type ?? 'lowpass';
    }
  }

  return {
    start: vi.fn(async () => undefined),
    now: vi.fn(() => 0),
    Destination: new MockNode(),
    Gain,
    Volume,
    Oscillator,
    Panner,
    LFO,
    Reverb,
    AutoPanner,
    EQ3,
    FeedbackDelay,
    Chorus,
    StereoWidener,
    Limiter,
    Analyser,
    Recorder,
    Noise,
    Filter,
  };
});

describe('AudioEngine graph integration with Tone mocks', () => {
  it('constructs the expanded fixed master chain and accepts safe control updates', async () => {
    const { getAudioEngine } = await import('./audioEngine');
    const engine = getAudioEngine();

    expect(toneMock.constructed).toContain('Reverb');
    expect(toneMock.constructed).toContain('AutoPanner');
    expect(toneMock.constructed).toContain('EQ3');
    expect(toneMock.constructed).toContain('FeedbackDelay');
    expect(toneMock.constructed).toContain('Chorus');
    expect(toneMock.constructed).toContain('StereoWidener');
    expect(toneMock.constructed.filter((name) => name === 'Limiter')).toHaveLength(2);
    expect(toneMock.constructed).toContain('Analyser');
    expect(toneMock.constructed.filter((name) => name === 'Analyser')).toHaveLength(2);
    expect(toneMock.constructed.filter((name) => name === 'Recorder')).toHaveLength(2);

    engine.setLimiterThreshold(-3);
    engine.setEq(true, 2, -1, 1.5);
    engine.setMasterStereoWidth(0.75);
    engine.setDelay(true, 0.2, 0.35, 0.3);
    engine.setChorus(true, 0.15, 1.2, 0.4);
    engine.setReverbPreDelay(0.05);
    engine.setDetune(0, 12);
    engine.setPhase(0, 90);
    engine.setTremoloShape(0, 'triangle');
    engine.setEnvelope(0, 0.1, 0.4);

    await engine.start();

    const meter = engine.getOutputMeter();

    expect(meter.peakLinear).toBeGreaterThan(0);
    expect(engine.isRunning()).toBe(true);
  });
});
