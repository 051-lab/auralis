---
id: AUR-WO-101
status: approved
owner_role: auralis_implementer
reviewers:
  - auralis_qa_reviewer
---

# Work Order: Bounded Shared-Preset Ingestion

## Objective

Replace unchecked shared-URL decoding with a bounded, version-aware result contract before any state mutation.

## Allowed paths

- `src/utils/sharePreset.ts`
- `src/utils/sharePreset.test.ts`
- Shared-preset types required by those files

## Forbidden paths

- `src/lib/audioEngine.ts`
- Built-in preset values
- Audio routing and UI layout

## Compatibility obligations

- Continue decoding compressed `v2.` transport links and legacy base64 links.
- Accept missing schema version and schema v1 through migration; accept schema v2.
- Reject unsupported future, fractional, zero, or negative schema versions.
- Preserve current encoding output.

## Acceptance criteria

- Encoded input is limited to 2,000 characters.
- Decompressed JSON is limited to 32 KiB while streaming output.
- Only a plain-object root and recognized bounded fields are returned.
- Four oscillators and five tags are the maximum accepted collections.
- Errors are discriminated as `too_large`, `invalid_encoding`, `decompression_limit`, `invalid_json`, `invalid_shape`, or `unsupported_version`.
- Payload contents are not logged.
- Negative tests cover malformed encodings, gzip, JSON, shape, size, and versions.

## Required validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Rollback boundary

Revert the AUR-WO-101 commit without changing persisted state or audio behavior.
