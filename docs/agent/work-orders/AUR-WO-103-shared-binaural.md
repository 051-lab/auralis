---
id: AUR-WO-103
status: approved
owner_role: auralis_implementer
reviewers:
  - auralis_qa_reviewer
  - auralis_audio_validator
---

# Work Order: Strict Shared Binaural Activation

## Objective

Treat shared binaural state as activation intent and route it through the canonical acknowledgement, isolation, snapshot, and restoration workflow.

## Dependencies

- AUR-WO-101
- AUR-WO-102

## Allowed paths

- `src/app/page.tsx`
- `src/store/useAuralisStore.ts`
- `src/utils/binaural.ts`
- Corresponding unit and Playwright tests

## Forbidden paths

- `src/lib/audioEngine.ts`
- Built-in preset values
- Audio graph topology and limiter settings

## Compatibility obligations

- Non-binaural shared links load as before.
- Shared links never directly establish runtime binaural mode.
- Cancellation leaves imported controls loaded in ordinary mode.
- Confirmation enforces strict carriers and exit restores imported state and identity.

## Acceptance criteria

- `applySharedPreset` always writes ordinary mode.
- A valid request requires ordered finite carriers in 20-20,000 Hz with a 0.5-60 Hz difference.
- First activation requires acknowledgement; prior acknowledgement remains honored.
- Hostile effects, movement, noise, texture, tremolo, and extra carriers cannot survive strict lock.
- Failed ingestion or invalid binaural intent produces no successful load analytics or lock state.
- Chromium covers confirm, cancel, hard reload, invalid request, and exit restoration.

## Required validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Rollback boundary

Revert AUR-WO-103 while retaining input and persistence hardening.

