---
id: AUR-WO-102
status: approved
owner_role: auralis_implementer
reviewers:
  - auralis_qa_reviewer
---

# Work Order: Persisted Preset Migration Hardening

## Objective

Add an explicit Zustand envelope migration and safely retain only compatible persisted user presets.

## Dependencies

- AUR-WO-101

## Allowed paths

- `src/store/useAuralisStore.ts`
- `src/store/useAuralisStore.test.ts`

## Forbidden paths

- Audio engine and UI
- Built-in preset values
- Shared transport encoding

## Compatibility obligations

- Existing unversioned storage is envelope version 0.
- Envelope version 1 is current.
- Versionless, schema-v1, and schema-v2 user presets remain loadable.
- Invalid/future presets are dropped individually without losing valid presets or built-ins.
- Runtime playback, recording, timer, and active identity are never restored from persisted input.

## Acceptance criteria

- Persist middleware declares version 1 and an explicit migration.
- Persisted roots and preset arrays are shape-checked before access.
- The 50-user-preset limit and built-in ID protection remain enforced.
- Tests cover corrupt roots, mixed valid/invalid entries, collisions, oversized arrays, and future versions.

## Required validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Rollback boundary

Revert the AUR-WO-102 commit while retaining AUR-WO-101.
