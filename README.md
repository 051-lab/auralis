# Auralis

Auralis is a browser-based sound laboratory for layered synthesis, binaural-style listening, procedural textures, session design, visualization, and local recording/export. It is built with Next.js, React, TypeScript, Tone.js, Tailwind CSS, and Zustand.

> **Important:** Auralis is experimental audio software, not a medical device. Start at low volume, use headphones carefully, and stop if listening becomes uncomfortable. Presets are designed around listening goals; they do not guarantee or cause specific mental states.

## Current status

The engineering release gates pass on the current `main` branch. Manual listening QA for every built-in preset remains the final release gate; use [the preset QA log](docs/audio/PRESET_QA_LOG.md) to record it.

Current capabilities include:

- Four oscillators with waveform, frequency, detune, phase, gain, pan, envelopes, tremolo, mute/solo, and harmonic linking
- Strict binaural mode with isolated left/right carriers and complete state restoration on exit
- Filtered noise and procedural rain, storm, wind, ocean, and drone textures
- Reverb, auto-panner, EQ, delay, chorus, stereo width, and a configurable safety limiter
- Pre/post-limiter output metering with measured limiter reduction
- Preset metadata, search, categories, local persistence, sharing, and modification tracking
- Session timer with cancellation-safe fades and wake-lock support
- Wet or dry browser recording, WAV rendering, and recoverable pending exports after playback stops
- Responsive premium dashboard with compact mobile rack controls

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 18 + Tailwind CSS
- **Audio:** Tone.js / Web Audio API
- **State:** Zustand with persisted local presets
- **Language:** TypeScript
- **Tests:** Vitest + Playwright
- **Analytics:** Optional Plausible integration

## Quick start

```bash
git clone https://github.com/051-lab/auralis.git
cd auralis
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. If that port is occupied, Next.js prints the alternate port it selected.

## Validation

```bash
npm run lint       # ESLint
npm run typecheck  # Generate Next route types and run TypeScript
npm test           # Vitest unit/integration tests
npm run build      # Production build
npm run test:e2e   # Playwright browser release gate
```

## Audio architecture

The four oscillator channels, filtered noise, and procedural texture sources feed a shared master chain:

```text
Oscillators / Noise / Texture
  -> masterGain -> userVolume -> transportFade
  -> Reverb -> AutoPanner -> EQ -> Delay -> Chorus -> Stereo Width
  -> pre-limiter analyser -> Limiter -> post-limiter analyser
  -> Destination + wet recorder

transportFade -> dry recorder limiter -> dry recorder
```

The output meter compares pre- and post-limiter samples and reads Tone.js limiter reduction. It is practical safety feedback, not mastering-grade true-peak instrumentation.

Strict binaural mode snapshots the complete affected sound state, isolates two sine carriers hard left/right, disables movement and ambience paths that can blur their channel relationship, and locks conflicting controls until exit. Exiting restores the prior state.

## Recording behavior

- **Wet export** captures the processed, limited master output.
- **Dry export** taps before master effects and passes through a dedicated recording limiter.
- Stopping playback or reaching a timer endpoint captures the audible fade tail, then presents a pending export that can be downloaded or discarded.
- Explicitly stopping the recorder exports immediately.
- Browser recording support and decode behavior can vary by browser.

## Project structure

```text
src/app/                 Application shell and dashboard wiring
src/components/          Audio controls, timer, visualizer, and meters
src/lib/audioEngine.ts   Tone.js graph, transport, analyser, and recording
src/store/               Persisted application and preset state
src/utils/               Pure audio, preset, export, and UI helpers
tests/                   Playwright browser workflows
docs/audio/              Architecture, research, safety, and QA guidance
knowledge/               Local research library (not application runtime data)
```

## Research and release docs

- [Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)
- [Active Development Loop](docs/ACTIVE_DEVELOPMENT_LOOP.md)
- [Audio Architecture Audit](docs/audio/AUDIO_ARCHITECTURE_AUDIT.md)
- [Audio Improvement Backlog](docs/audio/AUDIO_IMPROVEMENT_BACKLOG.md)
- [Preset Design Guide](docs/audio/PRESET_DESIGN_GUIDE.md)
- [Preset QA Log](docs/audio/PRESET_QA_LOG.md)
- [Responsible Audio Guidelines](docs/audio/RESPONSIBLE_AUDIO_GUIDELINES.md)
- [Reading Roadmap](docs/audio/READING_ROADMAP.md)
- [Research Implementation Notes](docs/audio/RESEARCH_IMPLEMENTATION_NOTES.md)
- [Browser Compatibility Checklist](docs/audio/BROWSER_AUDIO_COMPATIBILITY_CHECKLIST.md)
- [Next Audio Engine Tasks](docs/audio/NEXT_AUDIO_ENGINE_TASKS.md)
- [Security Notes](docs/SECURITY_NOTES.md)

## Known limitations

- Manual listening QA is still required for built-in presets at multiple output levels.
- Metering is sample-window based and does not replace calibrated loudness or true-peak measurement.
- Pending recordings are held in memory; reloading discards them after a browser warning.
- MediaRecorder formats and Web Audio behavior vary across browsers and devices.
- HRTF/3D spatial processing remains a separate research task requiring dedicated design and listening validation.

## Responsible language

Use wording such as “designed around,” “inspired by,” “intended for,” or “may support.” Do not claim that a preset heals, treats, guarantees an outcome, or puts a listener’s brain into a specific state.

## License

See [LICENSE](LICENSE).
