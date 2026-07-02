# Auralis Audio Improvement Backlog

This backlog prioritizes audio-side work after the dashboard UI stabilization. It is intentionally phased so Auralis can improve sound quality and safety without risky full-engine rewrites.

## Phase 1 - Safety, Gain Staging, and Output Quality

| Item | Priority | Difficulty | Risk | Files likely affected | Now or later |
| --- | --- | --- | --- | --- | --- |
| Add output meter and limiter activity indicator | Critical | Medium | Medium | `src/lib/audioEngine.ts`, `src/app/page.tsx`, `src/components/*`, tests | Implemented - analyser-based limiter proxy |
| Calibrate master gain and default oscillator/noise levels | Critical | Medium | Low | `src/store/useAuralisStore.ts`, `src/utils/gainStaging.ts`, tests | Implemented - safer default oscillator gain and budget tests |
| Add dry export safety option or dry limiter note | High | Medium | Low | `src/lib/audioEngine.ts`, `src/app/page.tsx`, `src/utils/recordingExport.ts`, docs/tests | Implemented - dry recorder limiter and clear mode copy |
| Improve start/stop fade curves and cancellation behavior | High | Medium | Low | `src/lib/audioEngine.ts`, `src/components/Timer.tsx`, `src/app/page.tsx`, `src/utils/playbackState.ts`, tests | Implemented - cancellable fades and visible fading state |
| Add first-run safe headphone guidance | High | Small | Low | `src/app/page.tsx`, docs | Implemented - binaural acknowledgement gate |
| Add clipping/overload regression tests for gain math | High | Medium | Low | `src/utils/*`, tests | Implemented - gain budget tests |
| Add user-selectable limiter ceiling later | Medium | Medium | Medium | `src/lib/audioEngine.ts`, store, UI | Later |

Notes:

- A limiter already exists. The next step is visibility and calibration, not simply adding another limiter.
- Default output is now more conservative: the starter oscillator gains are 35% and the header meter is available for live review.
- Future calibration should use the meter plus listening tests to tune curated preset loudness and master gain targets.

## Phase 2 - Better Oscillator Design

| Item | Priority | Difficulty | Risk | Files likely affected | Now or later |
| --- | --- | --- | --- | --- | --- |
| Per-oscillator mute/solo | High | Medium | Medium | `src/store/useAuralisStore.ts`, `src/app/page.tsx`, `src/components/OscillatorPanel.tsx`, tests | Implemented |
| Fine/coarse frequency controls | High | Medium | Low | `src/components/OscillatorPanel.tsx`, `src/utils/audioMath.ts`, tests | Implemented |
| Detune controls in cents | Medium | Medium | Medium | `src/lib/audioEngine.ts`, store, UI, tests | Later - cents utilities implemented |
| Frequency locking/linking for harmonic pairs | Medium | Large | Medium | store, UI, audio math | Later |
| Better tremolo shaping | Medium | Medium | Medium | `src/lib/audioEngine.ts`, `src/components/OscillatorPanel.tsx` | Later |
| Optional attack/release envelopes | Medium | Large | Medium | `src/lib/audioEngine.ts`, store, UI | Later |
| Phase handling or phase reset controls | Low | Large | High | `src/lib/audioEngine.ts` | Later |

Notes:

- Mute/solo should come before adding more oscillators or modulation sources.
- Detune and phase controls are powerful but can confuse users if added too early.
- Mute/solo is now handled as effective gain at engine sync time so stored gain values remain intact.

## Phase 3 - Better Noise and Texture Design

| Item | Priority | Difficulty | Risk | Files likely affected | Now or later |
| --- | --- | --- | --- | --- | --- |
| Add noise low-pass/high-pass filter controls | High | Medium | Medium | `src/lib/audioEngine.ts`, `src/store/useAuralisStore.ts`, `src/app/page.tsx`, tests | Implemented |
| Add noise tone/tilt macro | Medium | Medium | Medium | audio engine, store, UI | Later |
| Stereo noise width | Medium | Medium | Low | `src/lib/audioEngine.ts`, `src/store/useAuralisStore.ts`, `src/app/page.tsx`, tests | Implemented |
| Layered ambience texture mode | Medium | Large | High | audio engine, store, preset system | Later |
| Slow evolving noise motion | Low | Large | Medium | audio engine, modulation model | Later |

Notes:

- Filtered noise is the safest first texture upgrade.
- White noise should remain conservative by default.
- The first filter pass is implemented with bounded high-pass and low-pass cutoffs saved in presets and shared URLs.
- Stereo width is implemented with Tone.js `StereoWidener` after the noise filters, with 50% as the neutral default.

## Phase 4 - Master Chain Improvements

| Item | Priority | Difficulty | Risk | Files likely affected | Now or later |
| --- | --- | --- | --- | --- | --- |
| Clarify limiter in UI signal chain | High | Small | Low | `src/app/page.tsx` | Implemented |
| Add simple EQ/filter section | Medium | Medium | Medium | `src/lib/audioEngine.ts`, store, UI, tests | Later |
| Add stereo width control | Medium | Medium | Medium | audio engine, store, UI | Later |
| Add delay/chorus options | Low | Large | High | audio engine, store, UI | Later |
| Higher-quality reverb options | Low | Large | Medium | audio engine, UI | Later |
| Signal chain ordering model | Medium | Large | Medium | store, audio engine, docs | Later |

Notes:

- The master chain should not become a plugin rack until safety and metering exist.
- Every new effect should have bypass, default, and gain-impact notes.

## Phase 5 - Binaural / Spatial Audio Improvements

| Item | Priority | Difficulty | Risk | Files likely affected | Now or later |
| --- | --- | --- | --- | --- | --- |
| Formal binaural builder | High | Medium | Medium | `src/app/page.tsx`, store, docs/tests | Implemented |
| Beat-frequency validation and warnings | High | Medium | Low | store, UI, docs/tests | Implemented |
| Stronger headphone-only guidance for binaural mode | High | Small | Low | `src/app/page.tsx`, docs | Implemented |
| Safe beat-frequency range copy | High | Small | Low | docs, preset metadata | Implemented |
| Stereo movement presets | Medium | Medium | Medium | audio engine, store, UI | Later |
| Spatial comfort notes | Medium | Small | Low | docs, preset metadata | Later |
| HRTF/3D spatial experiments | Low | Large | High | audio engine, new components | Later |

Notes:

- Binaural mode should remain explicit and conservative.
- Do not imply that a beat difference guarantees a brain state.
- Beat presets now show Gentle/Steady/Focused/Experimental guidance with headphone and comfort cautions.
- The custom builder now accepts exact beat-frequency input, previews the generated carrier pair, and validates the supported range before activation.
- First binaural activation now requires an inline stereo-headphone and low-volume acknowledgement, then stores that acknowledgement locally.

## Phase 6 - Preset Design System

| Item | Priority | Difficulty | Risk | Files likely affected | Now or later |
| --- | --- | --- | --- | --- | --- |
| Add preset metadata fields | High | Medium | Medium | `src/store/useAuralisStore.ts`, `src/app/page.tsx`, `src/utils/sharePreset.ts`, tests | Implemented |
| Add responsible descriptions for built-in presets | High | Medium | Low | store, UI, docs/tests | Implemented |
| Add intended-use labels | Medium | Medium | Low | store, UI | Implemented |
| Add session notes | Medium | Medium | Low | store, UI | Later |
| Add export-ready preset flags | Low | Medium | Low | store, UI | Later |
| Add YouTube/session prep fields | Low | Medium | Low | store, UI | Later |

Notes:

- Metadata unlocks better UX without changing the audio graph.
- Use "inspired by" and "intended for" language, not medical or deterministic claims.
- The first metadata pass is implemented on preset cards; deeper preset detail/editing can come later.

## Phase 7 - Testing and Measurement

| Item | Priority | Difficulty | Risk | Files likely affected | Now or later |
| --- | --- | --- | --- | --- | --- |
| Add audio math tests for dB/gain/cents helpers | High | Small | Low | `src/utils/*`, tests | Implemented |
| Add preset serialization tests for metadata | High | Medium | Low | `src/store/useAuralisStore.test.ts`, `src/utils/sharePreset.test.ts` | Implemented |
| Add gain range tests | High | Small | Low | store/tests | Implemented |
| Add export helper tests | Medium | Medium | Medium | new export utility tests | Later |
| Add browser compatibility checklist | Medium | Small | Low | docs | Implemented |
| Add Playwright smoke tests for audio UI flows | Medium | Large | Medium | e2e tests | Later |
| Add audio graph integration tests with mocks | Low | Large | Medium | audio engine tests | Later |

Notes:

- Start with deterministic math and state tests.
- Browser audio graph tests are valuable but more complex; do them after extracting more utilities.
