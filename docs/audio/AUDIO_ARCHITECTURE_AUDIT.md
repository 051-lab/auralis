# Auralis Audio Architecture Audit

This audit describes the current browser audio implementation after the premium dashboard, metering, modulation, and texture-layer passes. It is intended to guide future audio work without requiring risky full-engine rewrites.

## Current Audio Graph Overview

Auralis uses Tone.js through a singleton `AudioEngine` in `src/lib/audioEngine.ts`. The app creates four oscillator channels, one optional noise layer, and one optional procedural texture layer, then routes them into a shared master chain.

Current signal flow:

```text
Oscillator[n]
  -> Tone.Panner
  -> Tone.Gain
  -> Tremolo Gain stage
  -> masterGain

Noise
  -> noiseGain
  -> noiseHighpassFilter
  -> noiseLowpassFilter
  -> noiseStereoWidener
  -> masterGain

Texture Noise
  -> textureNoiseGain
  -> textureHighpassFilter
  -> textureLowpassFilter
  -> textureGain
  -> textureStereoWidener
  -> masterGain

Texture Oscillator
  -> textureOscillatorGain
  -> textureGain
  -> textureStereoWidener
  -> masterGain

masterGain
  -> userVolume
  -> transportFade
  -> Reverb
  -> AutoPanner
  -> EQ
  -> Delay
  -> Chorus
  -> StereoWidener
  -> Pre-limiter Analyser
  -> Limiter
  -> Post-limiter Analyser
  -> Tone.Destination

transportFade -> dryRecorderLimiter -> dryRecorder
Limiter       -> wetRecorder
```

Important implementation details:

- `AudioEngine` is lazy-created and stored on `globalThis` during development to reduce hot-module-reload graph duplication.
- Audio starts only after a user gesture via `Tone.start()`.
- Oscillator source nodes are started once, then output is controlled by gain and fade nodes.
- Texture sources are started once on demand, then controlled through a dedicated texture gain stage.
- A configurable `Tone.Limiter` is in the wet output path between pre/post analysers and before destination and wet recording.
- Dry recording taps the chain at `transportFade`, before reverb, auto-panner, analyser, and destination, then passes through a dedicated `Tone.Limiter(-1)` before the dry recorder.

## Current Oscillator Behavior

Each of the four oscillator channels is created with:

- Tone oscillator source
- Default waveform: `sine`
- Default frequencies: 200, 300, 400, and 500 Hz
- Per-channel `Tone.Panner`
- Per-channel gain defaulting to 0.35
- Per-channel tremolo gain stage
- Per-channel LFO for tremolo control

Frequency values are clamped to 20-20000 Hz in both the store and engine. The UI uses logarithmic frequency mapping for sliders, numeric inputs allow exact hertz entry, and fine/coarse buttons nudge each oscillator by 1 Hz or 10 Hz.

`src/utils/audioMath.ts` also provides cents and frequency-ratio helpers for future detune controls.

Waveforms supported:

- Sine
- Square
- Sawtooth
- Triangle

## Current Gain Staging Behavior

Current gain stages:

1. Per-oscillator gain: 0-1
2. Noise gain: 0-1
3. `masterGain`: initialized to 0.8
4. `userVolume`: controlled by the master volume UI, default 0.6
5. `transportFade`: fades between silence and active output
6. `Tone.Limiter(-1)`: final wet safety ceiling

Default gain calibration:

- First-load oscillators default to 35% gain rather than 50%.
- The 35% default keeps the four-oscillator starter patch under the nominal gain-budget target before the limiter.
- `src/utils/gainStaging.ts` provides a conservative source-load estimate for defaults and future preset review.

Strengths:

- The app has a master volume control and a limiter.
- All user-facing gain values are clamped.
- Start and stop actions use ramping rather than instant output jumps.
- Default oscillator levels now leave more headroom than the original starter patch.
- Output metering makes hot output and limiter proximity visible in the header.

Risks:

- Four oscillators plus noise and reverb can still drive the limiter heavily.
- The gain-budget helper is a conservative source-load estimate, not a measured loudness model.
- Default oscillator gains are safer, but not calibrated against perceived loudness across every waveform.
- Dry export bypasses reverb and auto-panner, but it now records through a dedicated safety limiter.

## Current Pan and Stereo Behavior

Each oscillator has a `Tone.Panner` with pan clamped from -1 to 1.

Binaural mode uses hard left and hard right panning:

- Oscillator 1: base frequency, hard left
- Oscillator 2: base frequency plus beat frequency, hard right
- Oscillators 3 and 4: gain set to 0

The app disables reverb wet and auto-panner depth during manual binaural activation, then restores the previous master FX state on exit.

Risks:

- Binaural behavior depends on stereo headphones and user listening setup.
- The inline acknowledgement gate improves safety, but it cannot verify the listener is actually using headphones.
- Beat-frequency guidance distinguishes gentle, steady, focused, and experimental ranges, but it remains descriptive and not deterministic.

## Current Tremolo Behavior

Tremolo is implemented as amplitude modulation through a dedicated tremolo gain stage. Each oscillator has:

- A `Tone.LFO`
- A `Tone.Gain` used as the multiplicative amplitude stage
- Tremolo rate clamped to 0.1-30 Hz
- Tremolo depth clamped to 0-1

The LFO range is configured as:

```text
min = 1 - depth
max = 1
```

So depth controls how far the signal dips below the base oscillator gain while preserving the peak level.

Strengths:

- Tremolo no longer needs to raise loudness above the base gain.
- Disabling tremolo disconnects the LFO and ramps the tremolo gain back to 1.

Risks:

- Tremolo shape is now selectable, so square/saw movement should be used carefully at high depths.
- Phase controls exist per oscillator, but there is not yet a global phase reset/sync command across the whole rack.
- Very high tremolo rates can cross into roughness/ring-modulation territory for some listeners.

## Current Noise Layer Behavior

The noise layer uses one `Tone.Noise` source with selectable noise type:

- Brown
- Pink
- White

Signal flow:

```text
Noise -> noiseGain -> noiseHighpassFilter -> noiseLowpassFilter -> noiseStereoWidener -> masterGain
```

Noise is started only when audio is playing, noise is enabled, and noise gain is greater than 0. Noise gain ramps to zero when disabled or when playback stops.

Noise filter controls:

- High-pass cutoff: 20-500 Hz
- Low-pass cutoff: 500-12000 Hz
- Cutoff changes ramp to avoid zipper noise

Noise stereo shaping:

- Stereo width: 0-100%
- Default width: 50%, which maps to Tone.js neutral width and preserves the natural two-channel noise bed
- Binaural-oriented presets keep noise width conservative so the noise bed does not compete with carrier separation

Strengths:

- Noise can act as a soft masking bed under oscillator tones.
- Noise type, level, filter cutoffs, and stereo width are stored in presets and shared URLs.
- The high-pass, low-pass, and width controls help shape the bed without adding another full effect section.
- The modulation model can move noise filter and width within bounded ranges.

Risks:

- Stereo width can make the noise bed feel larger, but high width values should remain optional for headphone comfort.
- White noise at high gain can become uncomfortable quickly.

## Current Texture Layer Behavior

The texture layer is a separate generated branch intended for subtle ambience under the oscillator/noise design. It supports:

- Rain
- Storm
- Wind
- Ocean
- Drone

The layer uses filtered noise plus an optional low oscillator for heavier profiles such as storm and drone. Controls are stored in presets and shared URLs:

- Enabled/bypass
- Texture type
- Level
- Tone
- Stereo width
- Motion

Strengths:

- Texture is behind its own gain stage, so it can be kept quieter than the oscillator bed.
- Profiles are procedural and browser-local; no external sample assets are required.
- Texture motion moves filter cutoff and width slowly instead of adding abrupt effects.

Risks:

- Procedural texture profiles are useful but not as realistic as curated recordings.
- The drone texture adds another oscillator-like source, so preset review should watch output meter behavior.
- Texture width and motion need headphone comfort testing.

## Current Modulation Behavior

The modulation system is a bounded engine-side scheduler with preset-safe state. Modes:

- Off
- Gentle
- Breathing
- Pulse
- Drift

Targets:

- Noise filter
- Noise width
- Oscillator pan

Oscillator-pan modulation is automatically disabled while binaural mode is active, preserving hard-left/hard-right carrier separation.

Strengths:

- Movement is restricted to existing clamped parameters.
- Turning modulation off restores base noise and pan settings.
- Presets can carry movement settings without rewriting the core audio graph.

Risks:

- Modulation uses a lightweight interval scheduler rather than sample-accurate audio-rate automation.
- Pulse mode should be used gently because abrupt perceived movement can be distracting.
- Future modulation targets should be added one at a time with listening tests.

## Current Reverb Behavior

Reverb uses `Tone.Reverb` with:

- Wet/dry control: 0-1
- Decay control: 0.2-12 seconds
- Pre-delay control: 0-0.5 seconds
- Default wet: 0.3
- Default decay: 6 seconds
- Default pre-delay: 0.01 seconds

The app regenerates the reverb when decay or pre-delay changes.

Strengths:

- Reverb wet, decay, and pre-delay are exposed to users.
- Binaural activation sets wet reverb to 0 to preserve interaural frequency difference.

Risks:

- Reverb regeneration may be expensive or audible if changed aggressively.
- There is no damping, room type, or convolution option.
- Reverb can smear binaural cues if users manually re-enable it during binaural-style sessions.

## Current Master Chain Behavior

The main post-master chain is fixed-order:

```text
masterGain -> userVolume -> transportFade -> Reverb -> AutoPanner -> EQ -> Delay -> Chorus -> StereoWidener -> PreAnalyser -> Limiter -> PostAnalyser -> Destination
```

The dry recorder taps `transportFade` before these wet/master effects, then passes through its own limiter.

## Current Auto-Panner Behavior

Auto-panner uses `Tone.AutoPanner` after reverb.

Controls:

- Rate: 0-20 Hz
- Depth: 0-1
- Default rate: 0.2 Hz
- Default depth: 0.5

Strengths:

- Simple stereo motion adds spaciousness and movement.
- Binaural activation sets auto-panner depth to 0.

Risks:

- Fast panning can be fatiguing.
- Panning after reverb moves the whole wet signal, not individual layers.
- Auto-panning conflicts with strict binaural beat presentation.

## Current EQ, Delay, Chorus, Width, and Limiter Behavior

The expanded master chain adds bypass-safe controls after auto-panning:

- EQ: three-band low/mid/high gain, +/-12 dB, disabled by default
- Delay: wet, delay time, feedback, disabled by default
- Chorus: wet, rate, depth, disabled by default
- Master stereo width: 0-100%, default 50%
- Limiter ceiling: user-selectable between -12 dB and -0.1 dB, default -1 dB

Strengths:

- New effects are silent/bypassed by default, preserving existing presets until the user opts in.
- Limiter ceiling is visible and user-adjustable while preserving a final safety stage.
- The fixed order keeps the graph predictable and easier to document/test.

Risks:

- EQ boosts, delay feedback, chorus width, and texture layers can stack into hot output; use the output meter during preset design.
- Delay and chorus can blur strict binaural-carrier separation and should remain off for binaural-focused presets.
- The chain is fixed-order; users cannot reorder modules yet.

## Current Analyser and Visualizer Relationship

Matching waveform analysers sit immediately before and after the limiter. The output meter calculates input peak, output peak, output RMS, and reads `Tone.Limiter.reduction` for measured gain reduction. The visualizer reads the post-limiter analyser through `getAudioEngine().getAnalyser()` while audio is active.

The visualizer also renders an idle animated fallback when audio is stopped.

Strengths:

- The visualizer reflects the final wet output path after limiting.
- Canvas backing size is device-pixel-ratio aware.

Risks:

- Meter math, safe defaults, and threshold classification are unit-tested.
- Output metering is sample-window based and not true-peak or loudness calibrated.
- The visualizer may imply more signal detail than it actually measures because it uses a stylized rendering.

## Current Recording and Export Path

Recording uses two `Tone.Recorder` instances:

- Wet recorder: connected after the main output limiter
- Dry recorder: connected from `transportFade` through a dedicated dry-recorder limiter

The UI supports:

- Wet or dry mix selection
- Browser-native WebM export
- WAV target export by decoding the recorded blob, optionally resampling, and writing a 24-bit WAV blob
- 44.1 kHz or 48 kHz target sample-rate selection

Strengths:

- Wet and dry export are available.
- WAV export is generated locally in the browser.
- Recording requires playback to be active.
- Both wet and dry recorder paths are safety-limited.
- Playback/timer stop captures the audible fade tail and creates a pending export that can be downloaded or discarded.
- Explicit recorder stop finalizes immediately, and finalization is guarded against duplicate calls.

Risks:

- WAV conversion relies on browser decode support for the source recording format.
- WAV encoding helpers and browser recording workflows have automated coverage, although codec/decode support still requires target-browser checks.
- Recording is controlled from page state, while the engine also tracks recorder state; this is workable but needs careful future changes.

## Current Preset and State Flow

Zustand owns the main audio state:

- Oscillators
- Master FX
- Noise enabled/type/gain
- Binaural state
- Timer state
- Recording flag
- Presets
- Active preset identity, source, and modified status

The store persists only presets. Runtime controls reset to defaults on reload, while user presets remain available.

The page component subscribes to store state and syncs changes into the engine through a diffing `useEffect`. This avoids reapplying every parameter on every small change.

Preset flows:

- Built-in presets are merged with persisted user presets.
- User presets are capped.
- Shared presets use compressed URL encoding.
- Incoming presets are normalized and clamped before application.
- Loading a built-in, user, or shared preset establishes its identity; subsequent audio edits mark it modified.

Strengths:

- Store normalization is tested.
- Presets have a current version constant.
- Shared URLs are compressed and length-checked.

Risks:

- Preset metadata is intentionally concise, so richer session notes may need a future detail view.
- Presets now store descriptions, intended use, headphone recommendations, caution copy, and tags.
- Versioned normalization and migration protect older persisted/shared payloads.

## Strengths of the Current Implementation

- Clear Tone.js graph with separable oscillators, noise, texture, FX, analyser, and recorder.
- Safe clamping for frequency, gain, pan, tremolo, noise, texture, modulation, and master FX values.
- Master volume and limiter are already present.
- Strict binaural activation snapshots all affected state, isolates a sine carrier pair hard left/right, bypasses ambience/movement paths, locks conflicting controls, and restores the snapshot on exit.
- Start/stop and timer completion use cancellable fades with a visible `Fading` state.
- Store normalization and share encoding have unit tests.
- Visualizer reads from the final wet path after limiting.
- Browser-only architecture remains simple and local.

## Risks or Fragile Areas

- Metering is not mastering-grade true-peak or integrated-loudness measurement.
- Dry export is safety-limited but still bypasses wet FX by design.
- Reverb regeneration can become a performance or UX concern.
- Binaural mode relies on user headphone setup and responsible copy.
- Texture and modulation now exist, but their preset defaults need systematic listening review.
- Web Audio sound quality remains partly dependent on manual browser/device listening despite utility and browser workflow coverage.
- Presets now carry responsible-use metadata, but future preset work may need richer browsing and detail views.
- Some important audio behaviors are embedded in `page.tsx`, making future audio feature expansion harder.

## Immediate Improvement Opportunities

1. Review all built-in presets with the output meter after texture/modulation additions.
2. Complete target-browser and device checks for recording codecs and WAV conversion.
3. Design HRTF/3D spatial experiments separately before changing the production graph.
4. Add richer preset browsing/detail views only if the metadata outgrows compact cards.
5. Keep binaural language conservative: "designed around" or "inspired by", not "causes" or "treats".
