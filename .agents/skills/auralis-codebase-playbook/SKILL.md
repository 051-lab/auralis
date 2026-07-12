---
name: auralis-codebase-playbook
description: Inspect, trace, plan, or modify the Auralis Next.js, Zustand, and Tone.js codebase while preserving audio safety, live-engine synchronization, preset compatibility, and responsible product language.
---

# Auralis Codebase Playbook

Use this skill for repository analysis, implementation planning, bug fixing, refactoring, testing, and review in Auralis.

## Start with the real execution path

Read the relevant files before proposing a change. Common ownership surfaces include:

- `src/app/page.tsx` — primary UI orchestration and live-engine synchronization;
- `src/lib/audioEngine.ts` — singleton Tone.js engine, graph ownership, lifecycle, recording, modulation, and texture behavior;
- `src/store/useAuralisStore.ts` — normalized application state, persisted user presets, migrations, and preset actions;
- `src/components/` — oscillator, timer, visualizer, meter, session, preset, and control surfaces;
- `src/utils/` — audio math, gain staging, binaural rules, preset filtering, sharing, recording export, creator export, and playback helpers;
- `docs/` and `docs/audio/` — product direction, accepted behavior, safety guidance, research boundaries, and development roadmap;
- `tests/` and `e2e/` — existing automated contracts and browser workflows.

Do not rely on this map when the repository has changed. Search for the actual symbol and callers.

## Trace state changes end to end

For every changed control or preset field, identify:

1. UI event and input normalization.
2. Zustand action and stored representation.
3. Preset serialization, migration, persistence, and sharing behavior.
4. Live `AudioEngine` setter or synchronization path.
5. Tone.js parameter, node, timer, recorder, or browser API affected.
6. Cleanup and repeated-application behavior.
7. Unit, integration, browser, and listening validation required.

A store update alone does not prove the live graph changed. A live-engine mutation alone does not prove the UI and persisted state remain correct.

## Preserve important invariants

- The store persists presets and configuration, not transient live playback resources.
- Built-in presets remain protected and merge predictably with persisted user presets.
- Preset payloads are versioned, normalized, bounded, and backward compatible.
- Shared URL payloads and persisted browser data are untrusted input.
- Binaural mode is not undermined by auto-pan or oscillator-pan modulation.
- Output and wet/dry recording paths remain safety-limited.
- Noise, texture, modulation, and stacked oscillators can raise output quickly; preserve conservative defaults.
- Repeated start/stop and preset changes must not duplicate nodes, intervals, recorders, listeners, or wake locks.
- Responsible audio copy uses bounded language such as “designed for,” “intended for,” or “may support.” It does not claim treatment, diagnosis, guaranteed mental states, or medical outcomes.

## Change discipline

- Prefer small local seams over rewriting the engine.
- Avoid duplicate limiters or parallel state models.
- Keep store normalization and engine setters aligned.
- Update tests when changing utilities, state normalization, audio graph behavior, preset schema, sharing, persistence, recording, or export.
- Preserve build, lint, unit-test, and relevant Playwright hygiene.
- Mark subjective audio judgments for owner listening rather than treating numerical metrics as final acceptance.

## Common failure modes

- Loading a preset updates Zustand but not the already-running graph.
- Disabling tremolo, modulation, or texture restores a default rather than the user’s base value.
- A shared or old preset bypasses new bounds or omits a required migration.
- Binaural mode leaves a stereo-motion path active.
- Start/stop races leave a stale fade, recorder, interval, or node alive.
- Dry and wet recording taps diverge from documented signal paths.
- A UI-only test passes while the Web Audio graph is incorrect.
- Audio copy drifts into unsupported health claims.
