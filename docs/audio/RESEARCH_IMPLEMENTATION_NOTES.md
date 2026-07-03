# Auralis Research Implementation Notes

These notes are original implementation guidance distilled from the Auralis reading roadmap and knowledge-base direction. They are not copied from source books and should be treated as product-engineering notes, not academic summaries.

## Browser Audio Implementation

Auralis should continue treating the browser as a real audio runtime with constraints, not as a generic app shell.

Implementation guidance:

- Keep audio start user-gesture driven.
- Keep the Tone.js graph documented whenever routing changes.
- Prefer tested parameter mapping helpers over inline math.
- Keep recorder/export compatibility explicit, because browser support varies.
- Add diagnostics only when they help debugging: context state, sample rate, latency, recorder MIME support, and active output mode.

Current Auralis impact:

- `AudioEngine` remains a singleton to avoid hot-module-reload graph duplication.
- Output metering, dry/wet recorder paths, and limiter placement are now documented and tested through utilities where practical.
- Browser smoke tests now cover the dashboard and feature controls through installed Chrome.

## Sound Design And Synthesis

Auralis presets should be designed as layered sound scenes. Each layer should have a job.

Useful layer roles:

- Carrier tones: stable tones that define the core pitch/frequency relationship.
- Support tones: lower-gain harmonic or subharmonic material.
- Texture: filtered noise or procedural ambience that fills space.
- Motion: slow movement that prevents static fatigue without becoming distracting.
- Space: reverb and stereo width used conservatively.

Implementation guidance:

- Do not add more layers before reviewing output level and listener comfort.
- Keep modulation slow and bounded by default.
- Keep binaural-style presets simpler than ambient presets.
- For future envelopes, start with attack/release controls before more complex sequencing.

Current Auralis impact:

- Texture Layer adds rain, storm, wind, ocean, and drone as procedural ambience.
- Modulation adds bounded movement for filter, width, and optional pan.
- Preset category filters make sound roles easier to browse and test.

## DSP And Effects

Every new effect should have a defined signal-chain position, bypass behavior, and gain impact.

Implementation guidance:

- Avoid stacking effects that increase perceived loudness without meter feedback.
- Add simple tone-shaping before adding more character effects.
- Prefer one clear EQ/filter section before delay/chorus experiments.
- Keep limiter visibility and output metering visible during preset authoring.
- Add tests for conversion, normalization, serialization, and any non-audio pure helpers.

Current Auralis impact:

- Limiter visibility is handled by the output meter.
- Noise filters and texture filters are clamped and ramped.
- Preset QA now flags obvious gain and binaural-motion conflicts.

## Psychoacoustics And Listener Comfort

Listener comfort is not just peak level. Frequency region, roughness, masking, modulation rate, stereo width, and duration all matter.

Implementation guidance:

- Start all presets at conservative master volume and source gain.
- Treat white noise and bright high-frequency material carefully.
- Keep slow fade-in/fade-out behavior.
- Use lower texture gain for headphone-focused presets.
- Review presets at multiple master-volume positions, not only at the default.

Current Auralis impact:

- Built-in presets use conservative descriptions and defaults.
- Output meter and preset QA provide a first safety pass.
- Manual listening review remains required because perceived comfort cannot be fully unit-tested.

## Spatial And Binaural Design

Binaural-style presets should preserve stable left/right carrier relationships. General stereo motion belongs mostly in non-binaural ambience.

Implementation guidance:

- Keep auto-panner depth near zero for binaural-style presets.
- Do not enable oscillator-pan modulation in binaural-style presets.
- Use stereo headphones guidance for interaural frequency-difference presets.
- Keep texture width conservative in headphone-focused presets.
- Treat HRTF or 3D spatial experiments as a later, higher-risk research track.

Current Auralis impact:

- Binaural activation suppresses stereo-smearing FX.
- Modulation disables oscillator-pan movement while binaural mode is active.
- Preset QA flags binaural-motion conflicts.

## Rhythm And Responsible Entrainment Language

Auralis can use rhythm-band terminology as design inspiration, but it should not claim to force brain states.

Implementation guidance:

- Prefer "binaural-inspired" and "designed around a frequency difference".
- Avoid treatment, diagnosis, cure, and guarantee language.
- Keep session timing practical: fade-in, stable listening, fade-out.
- Label intense or experimental ranges carefully.
- Add notes fields for creator intent and listening context.

Current Auralis impact:

- Preset descriptions avoid medical claims.
- Creator export notes include non-medical disclaimers.
- Target duration and filename stem fields support longer content production without changing audio claims.

## Next Research-Driven Backlog Candidates

These are candidates, not automatic commitments:

1. Preset listening log with meter observations and subjective comfort notes.
2. Export helper extraction and tests for WAV rendering paths.
3. Optional reduced-motion visualizer setting.
4. Simple EQ/filter section before reverb.
5. Detune controls with cents display.
6. Session storyboard notes for long-form video capture.
7. Browser diagnostics panel for audio context and recorder support.
