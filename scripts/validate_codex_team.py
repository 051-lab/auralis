#!/usr/bin/env python3
"""Validate the repository-native Auralis Codex agent team.

Requires Python 3.11+ for tomllib. This script performs static configuration
checks only; it does not prove that a particular installed Codex release loaded
or executed the agents.
"""

from __future__ import annotations

import argparse
import json
import sys
import tomllib
from pathlib import Path
from typing import Any

REQUIRED_AGENTS = {
    "auralis_architect",
    "auralis_implementer",
    "auralis_qa_reviewer",
    "auralis_research_analyst",
    "auralis_audio_validator",
}
REQUIRED_SKILLS = {
    "auralis-codebase-playbook",
    "auralis-change-workflow",
    "auralis-audio-validation",
}
VALID_SANDBOX_MODES = {"read-only", "workspace-write", "danger-full-access"}


def load_toml(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        with path.open("rb") as handle:
            data = tomllib.load(handle)
    except FileNotFoundError:
        errors.append(f"missing file: {path}")
        return {}
    except tomllib.TOMLDecodeError as exc:
        errors.append(f"invalid TOML in {path}: {exc}")
        return {}
    if not isinstance(data, dict):
        errors.append(f"expected TOML table in {path}")
        return {}
    return data


def parse_skill_frontmatter(path: Path, errors: list[str]) -> dict[str, str]:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        errors.append(f"missing file: {path}")
        return {}

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        errors.append(f"missing YAML frontmatter opener in {path}")
        return {}

    try:
        end = next(index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---")
    except StopIteration:
        errors.append(f"missing YAML frontmatter closer in {path}")
        return {}

    metadata: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            errors.append(f"unsupported frontmatter line in {path}: {line!r}")
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip().strip('"\'')
    return metadata


def validate(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if not (root / "AGENTS.md").is_file():
        errors.append("missing root AGENTS.md")

    project_config = load_toml(root / ".codex" / "config.toml", errors)
    agents_config = project_config.get("agents")
    if not isinstance(agents_config, dict):
        errors.append(".codex/config.toml must contain an [agents] table")
    else:
        if agents_config.get("max_depth") != 1:
            errors.append("agents.max_depth must be 1 for bounded delegation")
        max_threads = agents_config.get("max_threads")
        if not isinstance(max_threads, int) or max_threads < 1:
            errors.append("agents.max_threads must be a positive integer")

    agent_dir = root / ".codex" / "agents"
    discovered_agent_names: set[str] = set()
    for path in sorted(agent_dir.glob("*.toml")):
        data = load_toml(path, errors)
        for field in ("name", "description", "developer_instructions"):
            value = data.get(field)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{path} requires non-empty {field!r}")

        name = data.get("name")
        if isinstance(name, str) and name:
            if name in discovered_agent_names:
                errors.append(f"duplicate custom agent name: {name}")
            discovered_agent_names.add(name)

        sandbox_mode = data.get("sandbox_mode")
        if sandbox_mode is not None and sandbox_mode not in VALID_SANDBOX_MODES:
            errors.append(f"invalid sandbox_mode in {path}: {sandbox_mode!r}")
        if sandbox_mode == "danger-full-access":
            errors.append(f"danger-full-access is not permitted for Auralis agents: {path}")

        reasoning = data.get("model_reasoning_effort")
        if reasoning is not None and reasoning not in {"none", "minimal", "low", "medium", "high", "xhigh"}:
            errors.append(f"invalid model_reasoning_effort in {path}: {reasoning!r}")

    missing_agents = REQUIRED_AGENTS - discovered_agent_names
    extra_agents = discovered_agent_names - REQUIRED_AGENTS
    if missing_agents:
        errors.append(f"missing required agents: {sorted(missing_agents)}")
    if extra_agents:
        warnings.append(f"additional custom agents discovered: {sorted(extra_agents)}")

    skills_dir = root / ".agents" / "skills"
    discovered_skills: set[str] = set()
    for skill_path in sorted(skills_dir.glob("*/SKILL.md")):
        metadata = parse_skill_frontmatter(skill_path, errors)
        name = metadata.get("name", "")
        description = metadata.get("description", "")
        if not name:
            errors.append(f"skill missing name: {skill_path}")
        else:
            if name in discovered_skills:
                errors.append(f"duplicate skill name: {name}")
            discovered_skills.add(name)
        if not description:
            errors.append(f"skill missing description: {skill_path}")

    missing_skills = REQUIRED_SKILLS - discovered_skills
    extra_skills = discovered_skills - REQUIRED_SKILLS
    if missing_skills:
        errors.append(f"missing required skills: {sorted(missing_skills)}")
    if extra_skills:
        warnings.append(f"additional repository skills discovered: {sorted(extra_skills)}")

    required_docs = [
        root / "docs" / "agent" / "README.md",
        root / "docs" / "agent" / "templates" / "work-order.md",
        root / "docs" / "agent" / "templates" / "handoff.md",
        root / "docs" / "agent" / "templates" / "review.md",
        root / "docs" / "agent" / "prompts" / "read-only-architecture-benchmark.md",
    ]
    for path in required_docs:
        if not path.is_file():
            errors.append(f"missing agent workflow document: {path}")

    return {
        "ok": not errors,
        "root": str(root),
        "agents": sorted(discovered_agent_names),
        "skills": sorted(discovered_skills),
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args()

    result = validate(args.root.resolve())
    if args.as_json:
        print(json.dumps(result, indent=2))
    else:
        status = "PASS" if result["ok"] else "FAIL"
        print(f"Auralis Codex team validation: {status}")
        print(f"Agents: {', '.join(result['agents']) or 'none'}")
        print(f"Skills: {', '.join(result['skills']) or 'none'}")
        for warning in result["warnings"]:
            print(f"WARNING: {warning}")
        for error in result["errors"]:
            print(f"ERROR: {error}")

    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
