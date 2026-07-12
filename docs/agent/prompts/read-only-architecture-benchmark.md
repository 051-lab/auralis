Perform a read-only architecture benchmark for the proposed Auralis Engine v2 initiative.

Use `$auralis-codebase-playbook` and `$auralis-change-workflow`.

Spawn these project-scoped agents:

1. `auralis_architect` to inspect the current architecture and propose the smallest incremental path toward:
   - a versioned canonical session specification;
   - a pure audio graph plan compiler;
   - live, offline, and mock runtime adapters;
   - deterministic audio qualification.

2. `auralis_qa_reviewer` to independently critique the architect’s findings, compatibility assumptions, work-order boundaries, and missing test or security risks.

3. `auralis_audio_validator` to evaluate whether the proposed validation strategy can objectively cover graph topology, signal output, resource lifecycle, recording paths, and preset compatibility.

Wait for all three agents and inspect their results before consolidating.

Constraints:

- Do not invoke `auralis_implementer`.
- Do not modify files, create branches, commit, push, or open a pull request.
- Do not perform external research unless a concrete unresolved technical fact requires it.
- Distinguish repository inspection from tests or runtime checks actually executed.
- Preserve current audible behavior as a Sprint 1 constraint.

Required consolidated output:

- repository-grounded current-system findings;
- responsibility and synchronization risks;
- compatibility and trust boundaries;
- deterministic versus nondeterministic behavior;
- missing test oracles;
- smallest target architecture;
- conflicts between the agents;
- unsafe assumptions and missing evidence;
- first three path-disjoint work orders;
- owner decisions required;
- final recommendation: `proceed`, `revise`, or `reject`;
- confirmation that no repository write operation occurred.
