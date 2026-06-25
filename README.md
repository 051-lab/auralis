# Auralis

Auralis is a browser-based somatic frequency generator and binaural entrainment prototype built with Next.js, React, Tone.js, Tailwind CSS, and Zustand.

The current application is designed as a high-control sound laboratory for testing generated tones, binaural beat presets, stereo motion, tremolo modulation, reverb, session timing, realtime visualization, local presets, and WAV export.

> **Important:** Auralis is an experimental sound and wellness tool. It is not medical software and should not be treated as a diagnostic, therapeutic, or clinical device. Use comfortable listening levels, especially with headphones.

## Current status

Auralis is ready for local development and first-pass browser testing.

The current `main` branch includes:

- Next.js App Router application shell
- Tone.js-powered synthesis engine
- Four independent oscillator channels
- Per-oscillator frequency, gain, waveform, pan, and tremolo controls
- Master reverb and auto-panner controls
- Binaural beat preset buttons
- Audio-reactive canvas visualizer
- Session timer with automatic fade-out
- Browser wake-lock support while audio is active
- Local preset saving/loading/deleting through Zustand persistence
- WAV recording/export of generated audio
- Optional Plausible analytics configuration

## Tech stack

- **Framework:** Next.js 14
- **UI:** React 18 + Tailwind CSS
- **Audio:** Tone.js
- **State:** Zustand + Zustand persist middleware
- **Language:** TypeScript
- **Analytics:** Optional Plausible.io integration

## Quick start

Clone the repository:

```bash
git clone https://github.com/051-lab/auralis.git
cd auralis
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Open the app in your browser:

```text
http://localhost:3000
```

## Available scripts

```bash
npm run dev      # Start local development server
npm run build    # Create a production build
npm run start    # Run the production build
npm run lint     # Run Next.js linting
```

## Environment variables

Auralis ships with `.env.example`:

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_ANALYTICS_ID=your-plausible-domain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For initial local testing, analytics can remain disabled:

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

Enable Plausible only after you have a real domain configured:

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_ID=your-domain.com
```

## Project structure

```text
src/
  app/
    globals.css          Global Tailwind and custom styles
    layout.tsx           Root layout, metadata, optional analytics script
    page.tsx             Main Auralis UI and control wiring
  components/
    OscillatorPanel.tsx  Per-oscillator controls
    Timer.tsx            Session timer and fade-out behavior
    Visualizer.tsx       Audio-reactive canvas visualizer
  lib/
    analytics.ts         Optional Plausible event tracking
    audioEngine.ts       Tone.js synthesis, FX, analyser, and recorder engine
    useAnalytics.ts      Route-change analytics hook
  store/
    useAuralisStore.ts   Zustand state and persisted presets
  utils/
    audioMath.ts         Logarithmic frequency conversion utilities
```

## Feature overview

### Audio engine

The core audio engine creates four Tone.js oscillator channels. Each channel routes through panning and gain before reaching the shared master chain.

Current master chain:

```text
Oscillators -> Panner -> Gain -> Master Gain -> Volume -> Reverb -> AutoPanner -> Analyser -> Destination
                                                                └──────────────-> Recorder
```

Supported channel controls:

- Frequency
- Gain
- Waveform: sine, square, sawtooth, triangle
- Stereo pan
- Tremolo enable/disable
- Tremolo rate
- Tremolo depth

Supported master controls:

- Reverb wet/dry
- Auto-panner speed
- Auto-panner depth

### Binaural mode

Auralis includes preset binaural beat buttons:

| Preset | Beat frequency |
| --- | ---: |
| Delta Sleep | 2 Hz |
| Theta Meditation | 6 Hz |
| Alpha Focus | 10 Hz |
| Beta Alertness | 20 Hz |
| Gamma Insight | 40 Hz |

Current binaural behavior:

- Oscillator 1 is set to the base frequency and panned hard left.
- Oscillator 2 is set to base frequency + beat frequency and panned hard right.
- Oscillators 3 and 4 are muted.

### Visualizer

The visualizer uses the Tone.js analyser output to draw a glowing, audio-reactive orb and circular waveform ring on a canvas.

### Presets

Users can save, load, and delete presets locally. Presets currently store:

- Oscillator settings
- Master FX settings
- Preset name
- Creation timestamp

Preset persistence is local to the browser through Zustand persist storage.

### Recording and export

When audio is playing, the app can record the generated output and export it as a `.wav` file.

### Timer

The session timer currently supports:

- 15 minutes
- 30 minutes
- 60 minutes

When the timer completes, Auralis fades the audio out over 10 seconds.

## Initial testing checklist

Use this checklist after pulling the repo and running the app locally.

### 1. Install and boot

```bash
npm install
npm run dev
```

Expected result:

- The app boots at `http://localhost:3000`.
- The Auralis header and visualizer are visible.
- No fatal browser console errors appear on first load.

### 2. Start and stop audio

- Click **Start Audio**.
- Confirm the browser allows audio playback after the user gesture.
- Confirm the status indicator changes to active.
- Click **Stop**.
- Confirm the audio fades/stops.

### 3. Test oscillator controls

For each oscillator:

- Move the frequency slider.
- Adjust gain.
- Change waveform.
- Pan left/right.
- Enable tremolo.
- Adjust tremolo speed and depth.

Expected result:

- Sound changes should be audible while audio is running.
- The visualizer should react to active audio.

### 4. Test binaural presets

- Start audio.
- Click each binaural preset.
- Use headphones for stereo verification.
- Confirm oscillator 1 and 2 create a hard-left/hard-right beat relationship.
- Click **Exit Binaural Mode**.

Expected result:

- Binaural mode activates without crashing.
- Oscillators 3 and 4 mute during binaural mode.

### 5. Test session timer

- Start audio.
- Select 15m, 30m, or 60m.
- Confirm countdown begins.
- Confirm the timer can be cleared.

For faster development testing, temporarily add a shorter timer value in `src/components/Timer.tsx`.

### 6. Test presets

- Create a sound configuration.
- Enter a preset name.
- Click **Save Preset**.
- Reload the page.
- Confirm the preset still appears.
- Load the preset.
- Delete the preset.

### 7. Test recording/export

- Start audio.
- Click **Record**.
- Let it record briefly.
- Click **Stop Rec**.
- Confirm a `.wav` file downloads.
- Open the file locally and verify audio was captured.

### 8. Run production checks

```bash
npm run build
npm run lint
```

Expected result:

- Production build completes.
- Linting either passes or exposes issues that can be triaged.

## Known implementation notes

These are worth checking during initial testing:

1. **Preset loading may need engine synchronization.**
   The store updates preset state, but the live Tone.js engine may need explicit setters after loading a preset while audio is already playing.

2. **URL preset loading is only stubbed.**
   `?preset=` is detected, but full URL import/export behavior is not implemented yet.

3. **Tremolo disable behavior may reset gain.**
   Disabling tremolo currently resets the oscillator gain path to a default value, so volume jumps should be tested.

4. **Timer completion may double-trigger stop tracking.**
   The timer calls fade-out and then calls the parent stop handler. This should be reviewed if analytics accuracy matters.

5. **Analytics script loading should be cleaned up before production.**
   The layout and analytics utility both include script-loading behavior. Keep analytics disabled during local testing unless needed.

6. **There is no limiter yet.**
   Multiple oscillators plus reverb and panning can become loud. Add a limiter before pushing intense presets or public demos.

7. **The app is currently a technical sound lab, not yet a simplified consumer experience.**
   A future preset-first or cinematic mode would make it feel closer to a polished wellness/frequency app.

## Suggested next development milestones

### Milestone 1: Stabilize the prototype

- Add a master limiter to the audio chain.
- Fix preset loading so UI state and live audio engine always match.
- Add a short developer timer option for testing.
- Confirm recording/export works across Chrome, Edge, and Safari.
- Add basic automated checks or a CI workflow.

### Milestone 2: Productize the experience

- Add named one-click sound journeys.
- Create a simplified session mode separate from the advanced oscillator editor.
- Add onboarding copy and headphone/volume safety warnings.
- Add import/export/shareable presets.
- Add a more cinematic visual mode.

### Milestone 3: Prepare for public release

- Add production metadata and real Open Graph images.
- Add deployment instructions.
- Add privacy policy notes if analytics are enabled.
- Add accessibility pass for controls and keyboard navigation.
- Add a stronger product landing section.

## Safety notes

- Start at a low volume.
- Be careful with headphones, especially high-frequency tones.
- Avoid sudden gain increases while multiple oscillators are active.
- Do not use while driving or operating machinery.
- Stop immediately if sound causes discomfort, dizziness, headache, or anxiety.
- Auralis is not a replacement for professional medical or mental-health care.

## Development philosophy

Auralis should be treated as a fusion of:

- Precision browser audio synthesis
- Somatic/ambient sound design
- Binaural entrainment experimentation
- Aesthetic visual feedback
- Preset-driven emotional experiences

The current codebase already supports the technical foundation. The next major leap is making the experience feel intentional, safe, and emotionally compelling without hiding the advanced controls from users who want to experiment.
