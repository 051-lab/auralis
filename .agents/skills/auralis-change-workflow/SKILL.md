---
name: auralis-change-workflow
description: Plan and execute non-trivial Auralis changes through bounded work orders, independent implementation and review, explicit validation evidence, contract-change handling, and owner-controlled integration.
---

# Auralis Change Workflow

Use this skill for changes that cross files, alter behavior, affect persistence or audio, or require independent review.

## 1. Classify the change

Classify the request as one or more of:

- documentation only;
- test characterization;
- UI behavior;
- state or persistence;
- preset schema or sharing;
- audio graph or runtime lifecycle;
- recording or export;
- architecture or cross-cutting refactor;
- sound-changing experiment.

Record the blast radius, trust boundaries, compatibility obligations, and whether owner listening is required.

## 2. Establish the contract

For architecture or cross-cutting work, delegate to `auralis_architect` first. Create a work order from `docs/agent/templates/work-order.md` containing:

- one objective;
- linked decisions and dependencies;
- allowed and forbidden paths;
- explicit non-goals;
- acceptance criteria observable by tests, inspection, measurement, or owner listening;
- required commands;
- required independent reviewers;
- rollback boundary.

Do not hide architecture decisions inside an implementation diff.

## 3. Characterize before refactoring

When changing established behavior, add or identify characterization tests before moving ownership or changing abstractions. For audio work, distinguish:

- exact structural contracts;
- deterministic signal metrics;
- browser/runtime behavior;
- subjective listening acceptance.

## 4. Implement one work order

Delegate to `auralis_implementer`. The implementer must:

- use an isolated branch or worktree when practical;
- modify only allowed paths;
- keep the diff small and reversible;
- update tests and docs with behavior;
- run required validation;
- return the handoff format in `docs/agent/templates/handoff.md`.

Never run concurrent writers against overlapping paths.

## 5. Handle blockers explicitly

Use this blocker shape:

```text
category: contract | environment | dependency | test | security | unknown
minimal_reproduction:
evidence:
affected_acceptance_criterion:
smallest_decision_required:
```

If the approved contract is insufficient or contradictory, stop and request a contract change. The architect or owner updates the decision before implementation resumes.

## 6. Review independently

Delegate to `auralis_qa_reviewer` after implementation. Add `auralis_audio_validator` when audio or lifecycle behavior can change. Reviewers inspect the approved contract and actual diff, not only the handoff summary.

A reviewer does not fix its own findings unless the owner explicitly assigns a new implementation work order.

## 7. Integrate under owner control

Before recommending integration, consolidate:

- implementation handoff;
- exact validation results;
- QA findings and verdict;
- audio validation and owner-listening requirements;
- unresolved risks;
- migration and rollback notes.

Do not merge or release without owner approval.

## Path-disjoint parallelism

Parallelize only independent read or review tasks. For implementation, define ownership boundaries such as:

- domain/schema and migrations;
- pure utilities and tests;
- UI components;
- runtime adapter;
- CI and documentation.

If two work orders require the same central file, sequence them.
