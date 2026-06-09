# Raw Data Units

Status: active
Category: convention
Last updated: 2026-06-09
Sources: `docs/raw/chore/2026-06-09-public-docs-cleanup.md`

## Decision

Raw notes are organized like branch work units. Each meaningful feature, bugfix,
or chore gets its own raw note.

```txt
docs/raw/
  feature/
  bugfix/
  chore/
```

## Naming

```txt
docs/raw/<unit-type>/<yyyy-mm-dd>-<short-topic>.md
```

Examples:

- `docs/raw/feature/2026-06-09-daily-quiz-loop.md`
- `docs/raw/bugfix/2026-06-09-local-storage-reset.md`
- `docs/raw/chore/2026-06-09-public-docs-cleanup.md`

## Capture Rules

- Capture durable facts, constraints, decisions, and verification results for
  the unit.
- Keep notes public-safe.
- Do not include credentials, private account details, local-only clone commands,
  or unnecessary third-party source-code provenance.
- When a unit changes project direction, update the relevant compiled wiki page
  and append `docs/wiki/log.md`.
