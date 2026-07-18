---
name: auralis-audio-validation
description: Validate Auralis audio graph, gain safety, binaural routing, modulation, recording, deterministic renders, signal metrics, and runtime cleanup without substituting metrics for owner listening.
---

# Auralis Audio Validation

Use this skill whenever a change can affect generated sound, signal routing, gain, stereo behavior, modulation, recording, export, or Web Audio lifecycle.

## Evidence layers

Use the strongest available oracle for each claim:

1. **Static graph inspection** — confirms intended nodes and connections, not runtime output.
2. **Pure contract tests** — exact assertions for normalization, graph plans, bounds, routing decisions, and migrations.
3. **Runtime lifecycle tests** — start, stop, update, dispose, repeated cycles, race handling, and resource ownership.
4. **Deterministic renders** — seeded or fixed-buffer inputs with tolerance-based signal metrics.
5. **Browser tests** — user gesture, autoplay, timer, wake lock, persistence, recording, download, and UI synchronization.
6. **Owner listening** — tonal balance, comfort, movement, harshness, immersion, and musical usefulness.

Never use one layer to claim evidence that belongs to another.

## Minimum scenarios

Choose the relevant subset and document omissions:

- silence and stopped output;
- one oscillator at conservative gain;
- stacked oscillators at permitted maximums;
- white, pink, and brown noise;
- each procedural texture profile;
- modulation off/on/off restoration;
- tremolo off/on/off restoration;
- binaural carrier pair with stereo-motion suppression;
- wet and dry recording paths;
- timer fade and manual stop races;
- repeated start/stop cycles;
- preset application while stopped and while running;
- old, malformed, and boundary preset payloads;
- 44.1 kHz and 48 kHz where offline rendering supports both.

## Structural assertions

Where possible, assert:

- one owned instance of each expected source and effect node;
- documented connection order;
- no accidental bypass around limiter or metering stages;
- dry and wet recorder taps match documented intent;
- binaural mode disables conflicting stereo motion;
- intervals, animation loops, recorders, listeners, and wake locks are released;
- start and stop are idempotent or explicitly guarded;
- parameter values are clamped before reaching runtime nodes.

## Signal metrics

For deterministic renders, record as applicable:

- peak level and clipping count;
- RMS level;
- integrated or short-term loudness when duration permits;
- DC offset;
- crest factor;
- channel balance;
- stereo correlation;
- expected carrier or modulation frequencies;
- silence duration and unexpected dropouts.

Derive tolerances from repeated baseline renders. Do not invent a tight threshold solely to make a test appear rigorous. Prefer tolerance-based comparisons over byte hashes unless bit stability has been demonstrated for the same engine and environment.

## Nondeterminism controls

- Inject fixed seeds or deterministic audio buffers for noise.
- Use explicit render duration, sample rate, start time, and parameter schedule.
- Avoid wall-clock timing in offline tests.
- Record browser, engine, operating system, and sample-rate differences when comparing live captures.

## Safety and listening

- Start manual checks at low volume.
- Preserve conservative gain defaults and limiter behavior.
- Flag sustained hot or limiter-heavy output for investigation.
- Treat headphone-dependent binaural behavior as setup-sensitive.
- Do not interpret psychoacoustic intent as a guaranteed cognitive or medical outcome.
- Require owner listening for subjective acceptance and document the devices/routes used.

## Report format

Return:

- change and accepted baseline;
- environment and commands;
- fixtures and parameter settings;
- exact structural findings;
- metrics with tolerances;
- failures and suspected causes;
- browser/manual checks not executed;
- owner-listening checklist;
- verdict: pass, pass-with-investigation, fail, or blocked.
