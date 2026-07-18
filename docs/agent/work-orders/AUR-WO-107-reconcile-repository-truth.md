---
id: AUR-WO-107
status: complete
owner_role: auralis_implementer
reviewers:
  - auralis_qa_reviewer
---

# Work Order: Reconcile Repository Truth

## Objective

Publish the reviewed local release-hardening candidate as a GitHub review branch and pull
request without rewriting history or merging it into `main`.

## Context and linked decisions

- The owner approved the review-branch and pull-request integration strategy.
- Local `main` was a direct fast-forward 13 commits ahead of `origin/main` at `7ab18d9`.
- `backup/pre-release-hardening-2026-07-16` preserves that pre-integration local tip.
- `review/auralis-release-hardening-2026-07-16` adds the approved AUR-WO-104 contract and
  implementation as separate commits.

## Dependencies

- AUR-WO-104 implementation and independent reviews are complete.

## Allowed paths

- `docs/agent/work-orders/AUR-WO-101-shared-ingestion.md`
- `docs/agent/work-orders/AUR-WO-102-persisted-migration.md`
- `docs/agent/work-orders/AUR-WO-103-shared-binaural.md`
- `docs/agent/work-orders/AUR-WO-107-reconcile-repository-truth.md`
- Review/handoff records for AUR-WO-104 and AUR-WO-107 under `docs/agent/`
- Git branch, commit, push, and pull-request operations for the review branch

## Forbidden paths

- Production source, tests, configuration, dependencies, and generated artifacts
- `main`, `origin/main`, commit rewriting, force pushes, and merges

## Non-goals

- Change application behavior or AUR-WO-104 thresholds.
- Start reliability work orders.
- Merge the review pull request.

## Compatibility obligations

- Presets, persisted state, shared URLs, audible behavior, recording, and browser behavior:
  unchanged by this work order.

## Acceptance criteria

- [x] Remove the three EOF whitespace failures without changing document meaning.
- [x] `git diff --check origin/main..HEAD` passes.
- [x] The review branch remains a direct descendant of `origin/main`; history is not rewritten.
- [x] AUR-WO-104 contract and implementation remain separate commits.
- [x] Full lint, typecheck, unit, build, Playwright, and Codex-team validation pass.
- [x] Push only the review branch and open a pull request targeting `main`.
- [x] Leave the pull request unmerged for owner review.

## Required validation

```bash
git diff --check origin/main..HEAD
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
python3 scripts/validate_codex_team.py
```

## Required evidence

- Candidate and remote SHAs, exact command results, review URL, and final branch status.

## Rollback boundary

Delete the remote/local review branch or revert only the reconciliation commits. Preserve
the backup ref and original 13 commits.

## Blocker policy

Stop if `origin/main` diverges, validation fails, publication requires a force push, or the
pull request cannot remain unmerged.
