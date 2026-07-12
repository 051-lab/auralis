# Auralis Codex Agent Team

This directory documents the repository-native Codex CLI team used for Auralis engineering. The configuration ports the useful Auralis-specific guidance from the earlier Fleet prototype into native Codex subagents and repository skills.

## Components

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Root engineering policy loaded by Codex in this repository. |
| `.codex/config.toml` | Project subagent concurrency and nesting limits. |
| `.codex/agents/*.toml` | Five project-scoped specialist agents. |
| `.agents/skills/*/SKILL.md` | Reusable Auralis codebase, change, and audio-validation workflows. |
| `docs/agent/templates/` | Durable work-order, handoff, and review formats. |
| `docs/agent/prompts/` | Repeatable kickoff prompts. |
| `scripts/validate_codex_team.py` | Static validation for the checked-in team configuration. |

## Team

- `auralis_architect` — read-only architecture, contracts, migrations, and work orders.
- `auralis_implementer` — one approved implementation work order.
- `auralis_qa_reviewer` — independent correctness and regression review.
- `auralis_research_analyst` — current external primary-source research when needed.
- `auralis_audio_validator` — independent audio graph, signal, and lifecycle validation.

Agent files inherit the model selected by the parent Codex session. This avoids pinning the repository to a model name that may not be enabled for every developer or may change over time.

## Prerequisites

1. Use a current Codex CLI release with subagent support.
2. Open the repository as a trusted project so Codex can load project-scoped `.codex/` configuration.
3. Launch Codex from the repository root.
4. Keep the parent permission mode appropriate for the task; live parent overrides can affect spawned agents.

## Validate installation

```powershell
python scripts/validate_codex_team.py
codex --ask-for-approval never "Summarize the repository instructions and list the available Auralis custom agents and skills. Do not modify files."
```

Inside an interactive Codex session:

- use `/skills` to confirm the three Auralis skills are visible;
- use `/agent` to inspect and switch between subagent threads;
- restart Codex if recently added skills or agent files are not discovered.

## First benchmark

Start Codex in read-only mode from the repository root and paste the contents of:

```text
docs/agent/prompts/read-only-architecture-benchmark.md
```

The benchmark deliberately excludes the Implementer. It tests delegation, repository grounding, independent critique, audio-validation reasoning, and scope control before any application code is changed.

## Implementation loop

1. Create or approve a work order from `templates/work-order.md`.
2. Ask the root Codex session to delegate the work to `auralis_implementer`.
3. Require the implementer handoff from `templates/handoff.md`.
4. Delegate independent review to `auralis_qa_reviewer`.
5. Add `auralis_audio_validator` when audio or lifecycle behavior can change.
6. Consolidate evidence and retain human merge and listening authority.

## Suggested kickoff prompt

```text
Use $auralis-change-workflow.

Implement the approved work order at <path>. Delegate implementation to
`auralis_implementer`, wait for completion, then delegate independent review to
`auralis_qa_reviewer`. Also delegate to `auralis_audio_validator` when the work
can affect audio or runtime lifecycle. Do not merge. Consolidate all evidence and
return a recommendation to the owner.
```

## Operational boundaries

- GitHub and committed repository artifacts remain the source of truth.
- Do not commit raw agent transcripts, credentials, private local paths, or proprietary listening material.
- Avoid concurrent write agents on overlapping files.
- Keep `agents.max_depth = 1` unless a reviewed use case justifies recursive delegation.
- The owner decides sound quality, merges, and releases.
