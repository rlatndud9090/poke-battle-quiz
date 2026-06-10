# Poke Battle Quiz ClaudeCode Guide

ClaudeCode uses the same project contract as Codex.

1. Read `AGENTS.md`.
2. Read `docs/wiki/index.md`.
3. Follow the shared harness in `docs/harness/`.
4. Use `.claude/commands` and `.claude/skills` only as thin adapters over that
   shared harness.

Do not create Claude-only process rules that conflict with `AGENTS.md` or
`docs/harness`. If a workflow rule changes, update the shared harness first and
then adjust the adapter.
