# Integrator

Owns final assembly, artifact hygiene, wiki ingest, verification, and commit.

Responsibilities:

- Confirm the raw unit matches the branch-derived path.
- Run wiki ingest when raw artifacts are new or materially updated.
- Run `npm run harness:gate`.
- Stage only relevant files.
- Commit with the Lore Commit Protocol.

The integrator should stop on failing checks and fix the cause before continuing.
