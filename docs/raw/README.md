# Raw Sources

Raw sources are the durable source of truth for this project. The wiki is only a
thin navigation layer over these files.

## Directory Shape

```txt
docs/raw/
  _templates/
  feature/
    YYYY-MM-DD-short-slug/
      prd.md
      adr.md
      notes.md
  bugfix/
    YYYY-MM-DD-short-slug/
      bugfix.md
      notes.md
  chore/
    YYYY-MM-DD-short-slug/
      notes.md
      adr.md
```

## Unit Types

- `feature/`: product capability or user-facing workflow.
- `bugfix/`: defect investigation and correction.
- `chore/`: setup, repository hygiene, documentation, tooling, and maintenance.

## Feature Development Flow

1. Create `docs/raw/feature/YYYY-MM-DD-short-slug/`.
2. Copy `docs/raw/_templates/feature-prd.md` to `prd.md`.
3. Copy `docs/raw/_templates/feature-adr.md` to `adr.md`.
4. Add `notes.md` from `docs/raw/_templates/notes.md` when implementation or
   verification details need to survive the session.
5. Update `docs/wiki/index.md` with one link line under the best category.
6. In commits, reference the raw unit path in the message body or trailer.

## Rules

- Keep raw sources public-safe: no credentials, private account details,
  local-only clone commands, or unnecessary third-party source-code provenance.
- Once a PRD or ADR is accepted, prefer a superseding ADR or an added note over
  rewriting the accepted artifact.
- Keep `docs/wiki/index.md` thin. Put details here in raw units, not in the wiki.
