# Next Audio Engine Tasks

This is the recommended engineering playbook for the next coding pass. The goal is to improve audio quality, safety, and preset usefulness without rewriting the full engine.

## 1. Add Output Metering and Limiter Feedback

Status: Implemented.

Implemented:

- `src/utils/audioMeter.ts` provides RMS/peak, dB conversion, threshold classification, and safe silent defaults.
- `src/lib/audioEngine.ts` exposes `getOutputMeter()` from the existing post-limiter analyser.
- `src/components/OutputMeter.tsx` displays RMS, peak, peak hold, and Safe/Output Hot/Limiter Active/Clip Risk status near master volume.
- The existing `Tone.Limiter(-1)` remains the only limiter in the output path.
- Dry export now bypasses wet FX but records through a dedicated `Tone.Limiter(-1)` before the dry recorder.
- `src/utils/recordingExport.ts` keeps wet/dry export labels and safety copy consistent.
- `src/utils/gainStaging.ts` adds a conservative source-load budget helper for default and preset review.
- First-load oscillator defaults are now 35% gain, leaving more pre-limiter headroom than the original 50% starter patch.
- Gain-staging tests cover default headroom, hot/limiter-risk classification, mute/solo behavior, and noise contribution.

Limitations:

- Limiter activity is currently inferred from post-limiter peak level near the limiter ceiling. Tone.js does not expose exact gain-reduction telemetry from `Tone.Limiter`.
- The meter is sample-window based and intended as practical UI feedback, not calibrated mastering-grade measurement.

Goal:

- Make output level and limiter activity visible to the user.

Why it matters:

- A limiter already exists, but users and developers cannot tell when the signal is pushing into it.
- Metering supports safer preset design and better gain calibration.
- The calibrated default patch should start usable but conservative before the user raises volume or adds layers.

Proposed implementation:

- Add a lightweight meter readout using analyser data or a dedicated meter node.
- Display peak/RMS-style activity in the Master Chain or header.
- Add a "limiting" indicator if output consistently approaches the ceiling.
- Keep the existing `Tone.Limiter(-1)` in place.

Files affected:

- `src/lib/audioEngine.ts`
- `src/app/page.tsx`
- `src/components/Visualizer.tsx` or a new meter component
- Tests for any extracted math helpers

Test plan:

- Unit-test meter conversion helpers.
- Unit-test gain budget helpers and default starter-patch headroom.
- Manually test with one oscillator, four oscillators, noise enabled, and high reverb.
- Confirm no build or hydration errors.

UI impact:

- Small meter or indicator in Master Chain or transport.
- No layout restructure.

Risks:

- Analyser-derived values may not be exact true peak values.
- Too much UI feedback could make the app feel technical; keep it restrained.

## 2. Improve Start/Stop and Timer Fade Behavior

Status: Implemented.

Implemented:

- Engine fade timings are now named constants.
- Start fade-in is smoother than the original near-immediate ramp.
- Manual stop and timer fade paths fade the noise layer over the same requested duration instead of dropping the noise layer almost immediately.
- `fadeOutAndStop()` returns whether the fade actually completed, so a restart can cancel a pending fade without stale stop handling.
- The UI exposes a distinct `Fading` transport state while the output tail is still audible.
- Meters, visualizer, wake lock, and noise sync treat `Fading` as audible.
- `src/utils/playbackState.ts` covers the `Live` / `Fading` / `Standby` status decision.

Goal:

- Make fades smoother, more predictable, and easier to test.

Why it matters:

- Startle-free playback is central to listener comfort.
- Timer fade completion should remain cancellation-safe if the user restarts playback.

Proposed implementation:

- Extract fade durations and curves into named constants.
- Consider using a short fade-in on start instead of immediate 0.05 second ramp.
- Keep token/cancellation logic.
- Add a clear "fading out" UI state later if useful.

Files affected:

- `src/lib/audioEngine.ts`
- `src/app/page.tsx`
- `src/components/Timer.tsx`

Test plan:

- Unit-test extracted playback state helpers.
- Manually test rapid start/stop clicks.
- Manually test timer completion and restart during fade-out.

UI impact:

- Possibly a temporary status message or subtle state label.
- No dashboard layout changes.

Risks:

- Overlong fades may make the app feel unresponsive.
- Restart during fade must not leave `transportFade` at silence.

## 3. Add Per-Oscillator Mute and Solo Controls

Status: Implemented.

Implemented:

- Each oscillator state now includes `muted` and `soloed` fields with safe defaults for old presets.
- The audio sync layer derives effective gain from mute/solo state without overwriting saved gain values.
- Each oscillator card has compact M/S controls.
- Binaural mode clears mute/solo while active and restores the previous state on exit.
- Store tests cover normalization and effective-gain behavior.

Goal:

- Let users isolate and manage oscillator layers safely.

Why it matters:

- Four oscillators can quickly become dense.
- Mute/solo helps preset design, debugging, and safe gain staging.

Proposed implementation:

- Extend `OscillatorState` with `muted` and possibly `soloed`.
- Derive effective gain in the engine sync layer or store helper.
- Keep original gain values intact when muting.
- Add compact M/S buttons to each oscillator card.

Files affected:

- `src/store/useAuralisStore.ts`
- `src/lib/audioEngine.ts`
- `src/app/page.tsx`
- `src/components/OscillatorPanel.tsx`
- `src/store/useAuralisStore.test.ts`

Test plan:

- Test normalization defaults for `muted` and `soloed`.
- Test preset serialization with new fields.
- Manual test: solo one oscillator, mute multiple, load presets.

UI impact:

- Small controls on oscillator cards.
- No rack layout change.

Risks:

- Solo logic can conflict with binaural mode if not clearly defined.
- Preset migration needs safe defaults.

## 4. Add Filter Controls to the Noise Layer

Status: Implemented.

Implemented:

- The audio graph now routes noise through a high-pass filter and low-pass filter before `masterGain`.
- Noise filter cutoffs are stored in presets and shared URLs with safe defaults for old presets.
- The Noise Layer card exposes high-pass and low-pass controls.
- Stereo width is implemented after the noise filters with Tone.js `StereoWidener`.
- Noise stereo width is stored in presets and shared URLs; 50% is the neutral default.
- Store tests cover cutoff clamping.

Goal:

- Make noise more comfortable and musically useful.

Why it matters:

- Current noise is broad and unfiltered.
- Filtered noise can provide softer beds and reduce harshness.

Proposed implementation:

- Add a `Tone.Filter` between `noiseGain` and `masterGain`.
- Start with one low-pass cutoff control and optional high-pass later.
- Store filter settings in presets.
- Add conservative defaults.

Files affected:

- `src/lib/audioEngine.ts`
- `src/store/useAuralisStore.ts`
- `src/app/page.tsx`
- `src/utils/audioMath.ts` if logarithmic cutoff mapping is needed
- Tests

Test plan:

- Test store normalization for cutoff bounds.
- Manual test brown, pink, and white noise at low/high cutoff values.
- Verify old presets load with default filter values.

UI impact:

- High-pass, low-pass, and stereo width controls in Noise Layer.
- No layout restructure.

Risks:

- White noise plus high cutoff can still be harsh.
- Filter changes should ramp to avoid zipper noise.

## 5. Add Preset Metadata and Responsible Descriptions

Status: Implemented.

Implemented:

- Presets now include description, intended use, headphone recommendation, caution text, and compact tags.
- Built-in presets use conservative, responsible descriptions with no deterministic medical claims.
- Shared preset payloads can include metadata.
- Preset cards show intent, description, tags, and headphone guidance without adding a new detail screen.
- Tests cover tag normalization and share payload round-trip metadata.

Goal:

- Make presets more informative and safer without changing the audio graph.

Why it matters:

- Current presets store audio parameters but not intent, headphone guidance, or responsible-use descriptions.
- Metadata supports a more serious preset library.

Proposed implementation:

- Extend `Preset` with optional fields:
  - `description`
  - `intendedUse`
  - `headphonesRecommended`
  - `caution`
  - `tags`
- Update built-in presets with conservative descriptions.
- Include metadata in shared preset payloads.
- Preserve backward compatibility through normalization.

Files affected:

- `src/store/useAuralisStore.ts`
- `src/utils/sharePreset.ts`
- `src/app/page.tsx`
- Preset card UI
- Store/share tests

Test plan:

- Test old presets normalize without metadata.
- Test shared preset round-trip with metadata.
- Manual test save/load/share built-in and user presets.

UI impact:

- Preset cards may show a short description or tag.
- Preset detail view may be needed later, but not required for the first pass.

Risks:

- More text can clutter the preset shelf.
- Descriptions must avoid medical or guaranteed-effect claims.

## Follow-On Implemented: Binaural Guidance and Validation

Implemented:

- `src/utils/binaural.ts` classifies beat-frequency ranges as Gentle, Steady, Focused, or Experimental.
- Binaural preset buttons now show concise guidance and responsible-use copy.
- Activation uses a shared base-frequency normalizer so the upper carrier stays within the supported range.
- Active binaural mode displays headphone/comfort cautions.
- Tests cover classification, guidance labels, and base-frequency normalization.
- The custom binaural builder accepts exact beat-frequency input from 0.5-60 Hz, previews the left/right carrier pair, and routes activation through the same validation path as built-in presets.
- First binaural activation is gated by an inline headphone/low-volume acknowledgement that persists in local storage after confirmation.

Remaining:

- Add optional settings to reset acknowledgement and adjust future binaural safety preferences.
