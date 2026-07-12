# Auralis Engineering Instructions

## Mission

Develop Auralis as a precise, safe, local-first browser audio laboratory. Use Codex subagents to improve reasoning quality and independent verification without creating a second source of project truth.

## Source of truth

The Git repository is the sole source of truth. Durable decisions belong in source files, tests, issues, pull requests, RFCs, ADRs, work orders, and review records—not only in chat history.

Read the relevant implementation and documentation before proposing changes. In particular, inspect the execution path through:

- `src/app/page.tsx`
- `src/lib/audioEngine.ts`
- `src/store/useAuralisStore.ts`
- the affected components and utilities
- preset normalization, persistence, sharing, recording, and export code
- relevant files under `docs/`
- current Vitest and Playwright coverage

Use `$auralis-codebase-playbook` for repository-specific invariants and navigation.

## Human authority

The project owner retains final authority for:

- product direction;
- architecture approval;
- sound-changing decisions;
- subjective listening acceptance;
- merge approval;
- release approval.

Do not merge, publish, or make a sound-changing acceptance decision without explicit owner approval.

## Mandatory delegation

Use the smallest useful team. Do not spawn agents merely to create activity.

### Architecture or cross-cutting changes

1. Spawn `auralis_architect` before implementation.
2. Require repository-grounded findings, explicit non-goals, compatibility obligations, and path-scoped work orders.
3. Do not begin implementation until the architecture or work order is approved by the owner.

### Approved implementation

1. Spawn `auralis_implementer` for one approved work order.
2. Do not assign concurrent write agents to overlapping paths.
3. After implementation, spawn `auralis_qa_reviewer` for independent review.
4. Also spawn `auralis_audio_validator` when a change can affect audio topology, gain, timing, modulation, binaural behavior, recording, export, preset sound, or runtime lifecycle.
5. Consolidate all findings before recommending integration.

### External research

Spawn `auralis_research_analyst` only when current external documentation or research is materially required. Prefer primary sources and keep external research separate from repository findings.

## Parallelism policy

Parallelize read-heavy exploration, independent review, test analysis, and external research when the tasks are independent.

Do not parallelize write-heavy work against overlapping files. Do not allow subagents to create deeper subagent trees; the root coordinator owns integration.

## Change policy

- Prefer small, reversible changes over broad rewrites.
- Preserve current audible behavior unless the approved work order explicitly authorizes a sound change.
- Preserve preset, persisted-state, and shared-URL compatibility unless an approved migration plan says otherwise.
- Treat imported presets, shared payloads, URL data, and persisted browser data as untrusted input.
- Keep store normalization, UI state, and live engine synchronization aligned.
- Preserve output and recording safety limits unless measured evidence and owner approval authorize a change.
- Keep binaural carriers free from uncontrolled auto-pan or oscillator-pan modulation.
- Do not introduce medical, therapeutic, diagnostic, or guaranteed-effect claims.
- Do not introduce accounts, cloud persistence, mandatory telemetry, microservices, or an agent runtime into the shipped application without explicit approval.
- Do not use the agent workflow itself as a reason to restructure unrelated application code.

## Work-order contract

Use `$auralis-change-workflow` for non-trivial changes. Every implementation work order must define:

- objective;
- dependencies and linked decisions;
- allowed paths;
- forbidden paths;
- non-goals;
- exact acceptance criteria;
- required validation commands;
- required reviewers;
- rollback boundary.

When the implementation cannot satisfy the approved contract, stop and return a contract-change request. Do not improvise a new architecture inside an implementation task.

## Verification

Never report a command as passing unless it was executed and its result was observed.

Baseline validation for application changes:

```bash
npm run lint
npm test
npm run build
```

Run `npm run test:e2e` when browser interactions, persistence, preset workflows, recording controls, or UI orchestration change.

Run the checks in `$auralis-audio-validation` when audio behavior or runtime lifecycle can change.

Validate the repository-native Codex team after changing agent or skill files:

```bash
python scripts/validate_codex_team.py
```

If an environment prevents a required command, report the exact blocker and distinguish static inspection from executed validation.

## Review standard

Review findings must lead with concrete defects and risks, not style preferences. Classify findings as:

- `blocking` — unsafe to merge;
- `major` — material correctness or regression risk;
- `minor` — bounded issue that should be corrected;
- `observation` — useful evidence or follow-up without a current defect.

For every actionable finding, include the file or symbol, failure mode, affected acceptance criterion, and smallest defensible remediation.

## Durable artifacts

Use `docs/agent/templates/` for work orders, handoffs, and reviews. Keep raw private prompts, local paths, credentials, and full agent transcripts out of the public repository.
