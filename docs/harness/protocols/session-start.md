# Session Start Protocol

Use this at the beginning of every agent session.

1. Read `AGENTS.md`.
2. Read `docs/wiki/index.md`.
3. Identify the active branch with `git rev-parse --abbrev-ref HEAD`.
4. If the branch is `feature/*`, `bugfix/*`, or `chore/*`, map it to
   `docs/raw/<type>/<slug>/` and read the relevant artifacts.
5. If the branch is `main`, read only the raw units linked from the wiki that are
   relevant to the task.
6. Before product or architecture decisions, read the relevant `prd.md` and
   `adr.md`.

Do not load every raw file by default. The wiki index is navigation; raw files
are the detailed source of truth.

If the user asks an open-ended next-work question, continue with
`docs/harness/protocols/work-intake.md`.
