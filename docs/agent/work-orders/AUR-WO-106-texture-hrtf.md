---
id: AUR-WO-106
status: approved-after-owner-listening-qa
owner_role: auralis_implementer
reviewers:
  - auralis_qa_reviewer
  - auralis_audio_validator
---

# Work Order: Texture-Only Static HRTF Experiment

## Objective

Evaluate optional static HRTF positioning on procedural texture without altering default, oscillator, noise, strict binaural, limiter, or recording behavior.

## Dependencies

- AUR-WO-101 through AUR-WO-103 complete
- All built-in preset listening rows approved

## Branch

`experiment/texture-static-hrtf` (local only)

## Allowed paths

- `src/lib/audioEngine.ts`
- `src/app/page.tsx`
- A pure spatial-coordinate utility and focused tests
- Playwright coverage and one experiment report

## Forbidden paths

- Zustand and preset schemas
- Persistence and shared URLs
- Built-in preset values
- Oscillator and noise branches
- Master effect order, limiter ceiling, and recorder taps

## Acceptance criteria

- Runtime-only and disabled by default.
- Exact existing texture route is restored whenever disabled.
- Enabled route uses one lazy HRTF panner and bypasses texture stereo widening.
- Static azimuth, elevation, and distance are bounded and have exact numeric controls.
- No movement timer, listener mutation, duplicate node, or stale connection.
- Strict binaural mode emits no texture/HRTF output.
- Failure restores normal texture routing.
- Full engineering gates and owner Comet A/B listening pass before promotion is considered.

## Rollback boundary

Delete the local experiment branch.
