---
id: AUR-WO-000
status: proposed
owner_role: auralis_implementer
reviewers:
  - auralis_qa_reviewer
  - auralis_audio_validator
---

# Work Order: <title>

## Objective

<One observable outcome.>

## Context and linked decisions

- <RFC, ADR, issue, accepted baseline, or repository evidence>

## Dependencies

- <Work that must be complete first>

## Allowed paths

- `<path>`

## Forbidden paths

- `<path>`

## Non-goals

- <Explicitly excluded work>

## Compatibility obligations

- Presets:
- Persisted state:
- Shared URLs:
- Audible behavior:
- Browser support:

## Acceptance criteria

- [ ] <Observable criterion>
- [ ] <Regression criterion>
- [ ] <Documentation criterion>
- [ ] <Owner-listening criterion, or “not required”>

## Required validation

```bash
npm run lint
npm test
npm run build
```

Additional commands:

```bash
# Add focused test, Playwright, or audio-validation commands.
```

## Required evidence

- <Test output, report, screenshot, render metrics, or manual checklist>

## Rollback boundary

<Smallest commit, feature flag, adapter, or file set that can be reverted.>

## Blocker policy

Stop and request a contract change when acceptance criteria cannot be met without changing scope, architecture, compatibility, safety limits, or audible behavior.
