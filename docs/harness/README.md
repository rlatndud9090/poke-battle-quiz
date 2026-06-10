# Cross-Agent Harness

This directory is the shared control surface for Codex, ClaudeCode, and future
agents. Tool-specific directories such as `.claude/` and `.codex/` are adapters;
they should point back here instead of becoming separate sources of truth.

## Core Rule

The branch name is the raw work-unit id.

```txt
feature/main-layout          -> docs/raw/feature/main-layout/
bugfix/ability-trigger-order -> docs/raw/bugfix/ability-trigger-order/
chore/cross-agent-harness    -> docs/raw/chore/cross-agent-harness/
```

Allowed branch prefixes are `feature/`, `bugfix/`, and `chore/`. The slug after
the slash must be kebab-case and must describe the core work, not a vague bucket
such as `misc`, `update`, or `fix`.

Historical date-prefixed raw units are preserved as legacy records. New work
should use branch-derived raw paths.

## Protocols

- [Session start](protocols/session-start.md)
- [Work intake](protocols/work-intake.md)
- [PRD drafting](protocols/prd-drafting.md)
- [Raw start](protocols/raw-start.md)
- [Feature develop](protocols/feature-develop.md)
- [Wiki ingest](protocols/wiki-ingest.md)
- [Artifact validation](protocols/artifact-validation.md)
- [Integration gate](protocols/integration-gate.md)
- [Commit protocol](protocols/commit-protocol.md)
- [UI verification](protocols/ui-verification.md)

## Roles

- [Intake helper](roles/intake-helper.md)
- [Unit planner](roles/unit-planner.md)
- [PRD writer](roles/prd-writer.md)
- [Architect](roles/architect.md)
- [Domain engineer](roles/domain-engineer.md)
- [UI engineer](roles/ui-engineer.md)
- [Test engineer](roles/test-engineer.md)
- [Integrator](roles/integrator.md)

## Scripts

```sh
npm run harness:start -- --type feature --slug main-layout --title "Main layout"
npm run harness:ingest -- docs/raw/feature/main-layout
npm run harness:check
npm run harness:gate
```

`harness:gate` runs the artifact check, lint, build, and test suite in sequence.

For open-ended starts such as "이제 뭐하지?", use the work intake protocol before
creating a raw unit.
