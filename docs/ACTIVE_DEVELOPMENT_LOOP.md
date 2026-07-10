# Auralis Active Development Loop

This file is the current execution loop for the remaining Auralis work. Complete one item, validate it, check it off here and in `TODO.md`, then move to the next item.

When every item is complete:

1. Move this file to `docs/archive/ACTIVE_DEVELOPMENT_LOOP-2026-07-02.md`.
2. Keep permanent docs such as `DEVELOPMENT_ROADMAP.md` and `docs/audio/*` in place unless they are superseded.
3. Do not delete implementation history unless the project owner explicitly asks for deletion.

## Loop Rules

- Keep the locked dashboard layout intact.
- Prefer small, testable changes.
- Preserve responsible audio language.
- Run validation before checking off an item.
- Use the output meter and listening notes for subjective preset quality decisions.

## Remaining Work

### 0. July 10 Release-Readiness Review

Status: Engineering complete.

- [x] Enforce strict binaural isolation and complete state restoration.
- [x] Replace inferred limiter feedback with pre/post measurement and direct reduction telemetry.
- [x] Track active preset identity and unsaved edits.
- [x] Preserve fade-tail recordings as pending exports.
- [x] Add TypeScript and Playwright CI release gates.
- [x] Add mobile collapsible racks while preserving the desktop dashboard.
- [x] Upgrade to Next.js 16 and document the remaining upstream audit exception.

### 1. Preset Quality Review

Status: Engineering complete; owner listening QA pending.

- [x] Add automated code-level preset QA for safe metadata, binaural movement, and gain ranges.
- [x] Add structured manual preset QA log.
- [x] Add output meter and limiter feedback to support listening review.
- [x] Keep built-in preset defaults conservative after texture/modulation additions.
- [ ] Owner QA: manually listen through each built-in preset at low, medium, and high master volume.
- [ ] Owner QA: record output-meter observations for each built-in preset.
- [ ] Owner QA: tune any preset that feels too loud, too bright, too wide, or too active.

### 2. Research Notes

Status: Complete for the current research pass.

- [x] Add original research implementation notes from the knowledge roadmap.
- [x] Convert first useful notes into concrete backlog candidates.

### 3. Browser Smoke Tests

Status: Complete.

- [x] Add Playwright smoke tests for the styled dashboard.
- [x] Add preset category/search smoke coverage.
- [x] Add modulation and texture control smoke coverage.
- [x] Add creator-notes and recorder-gating smoke coverage.
- [x] Add strict binaural, pending-export, active-preset, and mobile-rack browser coverage (11 workflows total).

### 4. Creator Workflow

Status: Complete.

- [x] Add target duration and export filename stem helpers.
- [x] Add preset categories for content planning.
- [x] Add optional storyboard notes for visualizer recording.
- [x] Add export-ready preset metadata for content/session production.

### 5. Audio Backlog Closeout

Status: Complete, except deliberately deferred research experiments.

- [x] Add detune, phase, tremolo-shape, and attack/release controls.
- [x] Add harmonic frequency-link mode for oscillator pairs/stacks.
- [x] Add user-selectable limiter ceiling.
- [x] Add master EQ, stereo width, delay, chorus, and reverb pre-delay controls.
- [x] Add export helper tests and browser smoke tests.
- [ ] Deferred: HRTF/3D spatial experiments remain research work because they need a separate design and listening validation pass.

### 6. Low-Priority UI Polish

Status: Deferred until visual QA requests a concrete change.

- [ ] Tune visualizer energy only if testing shows it feels flat.
- [ ] Improve preset thumbnails later if the library becomes visually repetitive.
- [ ] Keep hover/focus polish incremental.

This loop remains active until the owner listening rows in `docs/audio/PRESET_QA_LOG.md` are complete. HRTF research and optional visual polish are deferred work, not blockers for the current engineering release candidate.
