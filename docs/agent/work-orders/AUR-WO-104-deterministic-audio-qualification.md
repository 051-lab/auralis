---
id: AUR-WO-104
status: approved
owner_role: auralis_implementer
reviewers:
  - auralis_qa_reviewer
  - auralis_audio_validator
---

# Work Order: Deterministic Audio Qualification

## Objective

Add deterministic browser offline-render tests and pure signal-metric utilities covering
silence, mono equality, stereo isolation, stacked signals, and fade boundaries at 44.1 kHz
and 48 kHz without modifying or importing the production audio engine.

## Context and linked decisions

- The existing engine tests characterize graph construction through Tone.js mocks; they do
  not measure rendered samples.
- `src/utils/recordingExport.ts` uses `OfflineAudioContext` for export resampling, but the
  proposed harness must remain independent of recording/export behavior.
- The accepted architecture is a characterization-only harness using browser
  `OfflineAudioContext` plus pure metric utilities.
- This work order does not qualify Tone.js rendering, the live limiter/effects chain,
  recording fidelity, device output, or subjective sound.

## Dependencies

- Owner approval of this work order.
- Chromium support for `OfflineAudioContext` at both requested sample rates.

## Allowed paths

- `src/utils/audioQualification.ts`
- `src/utils/audioQualification.test.ts`
- `e2e/audio-qualification.spec.ts`

## Forbidden paths

- `src/lib/audioEngine.ts`
- `src/lib/audioEngine.test.ts`
- `src/utils/recordingExport.ts`
- `e2e/auralis-smoke.spec.ts`
- Store, UI, preset, persistence, sharing, recording, export, configuration, dependency,
  and existing test files

## Non-goals

- Render through Tone.js or the `AudioEngine` singleton.
- Change graph topology, gain, limiter, fade, effect, or default behavior.
- Test noise, textures, modulation, recorders, codecs, or WAV export.
- Add golden audio files, byte hashes, snapshots, performance benchmarks, or CI redesign.
- Claim production-engine parity or subjective audio acceptance.

## Compatibility obligations

- Presets: unchanged.
- Persisted state: unchanged.
- Shared URLs: unchanged.
- Audible behavior: unchanged; no production runtime imports from the qualification module.
- Recording/export behavior: unchanged.
- Browser support: no production change; qualification runs in configured Chromium only.

## Acceptance criteria

At both 44,100 Hz and 48,000 Hz:

- [ ] A one-second stereo silence render has peak, RMS, DC offset, and clipping count equal
  to zero.
- [ ] A one-second 997 Hz mono sine at amplitude 0.25 produces identical channels, maximum
  channel delta at or below `1e-7`, correlation at or above `0.999999`, peak within `2e-5`
  of `0.25`, RMS within `2e-5` of `0.25 / sqrt(2)`, DC magnitude at or below `1e-4`, and no
  samples with absolute amplitude at or above 1.
- [ ] Left-only and right-only scheduled windows have inactive-channel peak at or below
  `1e-7`, active-channel peak within `2e-5` of `0.25`, no non-finite samples, and no
  clipping.
- [ ] Four integer-frequency sine waves at amplitude 0.1 have peak at or below `0.40001`,
  RMS within `5e-4` of `sqrt(0.02)`, DC magnitude at or below `1e-4`, and no clipping.
- [ ] A fixed fade fixture is silent before 0.10 seconds, rises linearly to 0.25 by 0.45
  seconds, holds until 0.65 seconds, and falls linearly to silence by 1.25 seconds. Boundary
  timing tolerance is two frames, ramp monotonicity tolerance is `2e-5`, plateau tolerance
  is `2e-4`, and post-fade peak is at or below `1e-7`.
- [ ] Pure metric tests cover empty input, non-finite samples, peak, RMS, DC offset, clipping
  count, channel delta, and correlation.
- [ ] Fixtures use explicit buffers, duration, sample rate, channel routing, and schedules;
  no random or wall-clock input is used.
- [ ] No byte-hash assertion is introduced.
- [ ] Owner listening is not required for this harness-only change. It remains mandatory
  before these metrics support any claim about actual Auralis sound.

## Required validation

```bash
npm run lint
npm test
npm run build
npx playwright test e2e/audio-qualification.spec.ts --project=chromium
npm run test:e2e
```

## Required evidence

- Exact command results.
- A scenario-by-sample-rate metric table with actual values, tolerances, Chromium version,
  and verdict.
- Explicit statement that the fixtures do not exercise the production Tone.js graph.

## Rollback boundary

Revert the three allowed implementation files as one commit. No migration, application
rollback, or audio-baseline restoration is required.

## Blocker policy

Stop and request a contract change if implementation requires a forbidden path, importing
Tone.js or `AudioEngine`, changing production behavior, widening tolerances after failures,
adding browser-specific exceptions, changing sample rates or scenarios, adding binary
fixtures, or claiming qualification of the production engine or subjective sound.
