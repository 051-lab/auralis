# Auralis Audio Reading Roadmap

This roadmap uses the reading list as conceptual guidance for Auralis audio design. It does not reproduce book content. Notes here are original implementation ideas and responsible design reminders.

Book 8, `Binaural and Spatial Hearing in Real and Virtual Environments`, is not currently in the local collection.

## Track A: Browser Audio Implementation

### Web Audio API - Boris Smus

Why it matters for Auralis:

- Auralis is a browser-native audio lab, so Web Audio constraints define what is practical, stable, and portable.
- Even though the app uses Tone.js, understanding the underlying Web Audio graph helps with debugging, browser compatibility, latency, and recording.

App areas it should influence:

- `src/lib/audioEngine.ts`
- Recorder/export flow
- Analyser/visualizer behavior
- Start/resume behavior after browser user gestures
- Browser compatibility notes

Implementation ideas:

- Document the Tone.js graph as an underlying Web Audio graph.
- Add browser compatibility checks for recorder MIME types and WAV conversion.
- Add a small diagnostics panel later: audio context state, sample rate, base latency if available, and recorder support.
- Move export helper functions out of `page.tsx` into a tested utility module.

Cautions and responsible-use notes:

- Browser audio has device, driver, and browser differences. Avoid promising identical playback across systems.
- Autoplay and audio context behavior must remain user-gesture driven.

## Track B: Sound Design and Synthesis

### Designing Sound - Andy Farnell

Why it matters for Auralis:

- Auralis should become a designed sound environment, not just static oscillator playback.
- The book's general approach encourages thinking in terms of sound behavior, gestures, layers, and purpose.

App areas it should influence:

- Preset design
- Oscillator layering
- Noise texture controls
- Modulation controls
- Future envelope and motion systems

Implementation ideas:

- Add preset templates that describe sonic roles: carrier, texture, movement, support tone.
- Add optional envelopes for fade-in, fade-out, and soft onset.
- Add controlled randomization for subtle movement, with clear bounds.
- Add "texture" presets built from filtered noise plus low-gain tone layers.

Cautions and responsible-use notes:

- Richer sound design can increase loudness and fatigue. Add safeguards before adding more layers.
- Avoid hiding aggressive modulation inside calm-sounding preset names.

### The Computer Music Tutorial - Curtis Roads

Why it matters for Auralis:

- It provides broad conceptual grounding for synthesis, modulation, sampling, analysis, and musical structure.
- Auralis can grow from a tone generator into a structured browser sound lab.

App areas it should influence:

- Oscillator architecture
- Modulation design
- Preset categories
- Future sequencing or session timeline features
- Visualizer and analysis tooling

Implementation ideas:

- Add coarse/fine frequency controls and detune units.
- Add optional phase controls for oscillator relationships.
- Add modulation sources as first-class concepts: tremolo, panning, noise motion, and envelopes.
- Add a simple session timeline later for slow parameter evolution.

Cautions and responsible-use notes:

- More synthesis power increases complexity. Add features in small, measurable steps.
- Avoid adding advanced controls without clear defaults and safe ranges.

## Track C: Audio DSP and Effects

### The Audio Programming Book - Richard Boulanger and Victor Lazzarini

Why it matters for Auralis:

- It points the project toward disciplined DSP thinking: signal flow, envelopes, filters, modulation, analysis, and testing.
- Auralis needs more robust audio utilities before the graph becomes larger.

App areas it should influence:

- Audio math utilities
- Gain staging
- Envelope/fade design
- Filter controls
- Unit tests for parameter mapping

Implementation ideas:

- Add reusable conversion helpers for dB, linear gain, MIDI note, cents, and frequency ratios.
- Add tests for all control mappings.
- Add envelope helpers for start, stop, and timer fade curves.
- Add a small internal signal-flow diagram in docs whenever the engine changes.

Cautions and responsible-use notes:

- DSP controls should be bounded and testable.
- Avoid silent changes to gain staging without tests and before/after listening notes.

### DAFX: Digital Audio Effects - Udo Zolzer

Why it matters for Auralis:

- Auralis already has reverb, panning, tremolo, and limiting. Future effects should be added with attention to order, stability, and perceived loudness.

App areas it should influence:

- Master Chain
- Reverb
- Limiter
- Future EQ/filter, delay, chorus, and stereo width

Implementation ideas:

- Add a clearer master chain model in state.
- Add EQ/filter before reverb for tone shaping.
- Add a visible output meter and limiter activity.
- Add effect bypass states before adding more effects.
- Add dry/wet controls consistently for every effect.

Cautions and responsible-use notes:

- Effects can create clipping, excessive brightness, or motion discomfort.
- Any stereo movement or delay feature should have conservative defaults.

## Track D: Psychoacoustics and Listener Comfort

### Psychoacoustics: Facts and Models - Fastl and Zwicker

Why it matters for Auralis:

- Listener comfort depends on loudness, masking, roughness, beating, frequency region, and duration.
- Auralis should design for perceived sound, not just numeric signal values.

App areas it should influence:

- Gain defaults
- Noise levels
- Tremolo and beat-frequency ranges
- Safety copy
- Metering

Implementation ideas:

- Add lower default volume for first-run sessions.
- Add warning or visual feedback for high output combinations.
- Add comfort-oriented preset design rules.
- Add optional slow fade-in to reduce startle.
- Add frequency-region guidance for preset authors.

Cautions and responsible-use notes:

- Do not imply that psychoacoustic effects are medical interventions.
- Respect individual sensitivity and hearing differences.

### Music, Thought, and Feeling - William Forde Thompson

Why it matters for Auralis:

- It frames listening as cognitive, emotional, contextual, and subjective.
- This supports responsible preset naming and avoids overclaiming effects.

App areas it should influence:

- Preset descriptions
- Onboarding copy
- Session notes
- Tagging and intended-use language

Implementation ideas:

- Add preset descriptions such as "intended for quiet focus" rather than "causes focus."
- Add user notes for subjective reactions to presets.
- Add categories that describe listening context: rest, focus, ambient, exploration.

Cautions and responsible-use notes:

- Avoid deterministic claims about mood, cognition, or brain state.
- Treat user experience as variable and subjective.

## Track E: Spatial / Binaural / Headphone Design

### Spatial Hearing - Jens Blauert

Why it matters for Auralis:

- Panning and headphone listening are central to binaural-style sessions.
- Spatial hearing concepts can guide better stereo placement, width, and movement.

App areas it should influence:

- Pan controls
- Binaural builder
- Auto-panner presets
- Stereo noise width
- Headphone guidance

Implementation ideas:

- Add headphone-specific warnings and listening setup notes.
- Add stereo width controls separate from auto-panning.
- Add L/R balance checking for binaural presets.
- Add spatial comfort presets with slow, shallow movement.

Cautions and responsible-use notes:

- Do not assume speaker playback will preserve binaural relationships.
- Spatial motion can be fatiguing or disorienting for some users.

### Binaural and Spatial Hearing in Real and Virtual Environments - Gilkey and Anderson

Why it matters for Auralis:

- This is the missing reading-list item and should inform future binaural and virtual spatial work.
- It is especially relevant before adding more advanced spatialization or HRTF-style features.

App areas it should influence:

- Binaural mode
- Headphone-only workflows
- Spatial presets
- Future HRTF or 3D audio experiments

Implementation ideas:

- Add a formal binaural preset builder with base frequency, beat difference, pan validation, and FX suppression.
- Add a "headphones recommended/required for binaural presentation" UI state.
- Add documentation distinguishing binaural beats from general stereo motion.

Cautions and responsible-use notes:

- Research and listener response vary. Keep language conservative.
- Avoid claims that a beat frequency will force a brain state.

## Track F: Neuroscience / Rhythm / Responsible Entrainment Language

### Rhythms of the Brain - Gyorgy Buzsaki

Why it matters for Auralis:

- It encourages respect for the complexity of brain rhythms.
- It helps prevent simplistic claims that external audio directly controls brain states.

App areas it should influence:

- Brainwave preset language
- Responsible-use guidelines
- Preset metadata and descriptions
- Education copy

Implementation ideas:

- Rename or describe presets as "inspired by" rhythm bands.
- Add short disclaimers near binaural presets.
- Add metadata fields that separate sonic design parameters from intended listening context.

Cautions and responsible-use notes:

- Brain rhythms are complex biological phenomena.
- Binaural beat research is mixed and should not be presented as guaranteed entrainment.

### Rhythm, Music, and the Brain - Michael H. Thaut

Why it matters for Auralis:

- It connects rhythm, timing, perception, and therapeutic contexts, while reminding the project to avoid clinical claims.
- It supports careful thinking about temporal structure and session design.

App areas it should influence:

- Timer/session design
- Tremolo and modulation rates
- Future rhythmic modulation presets
- Responsible language

Implementation ideas:

- Add session structures with gradual fade-in, stable listening period, and fade-out.
- Add modulation presets with clear rate ranges and comfort notes.
- Add "session notes" to presets so users know what changes over time.

Cautions and responsible-use notes:

- Do not borrow clinical authority for a consumer sound tool.
- Avoid treatment, diagnosis, and guaranteed outcome language.
