# Raw Sources

Raw sources are the durable source of truth for this project. The wiki is only a
thin navigation layer over these files.

## Directory Shape

```txt
docs/raw/
  _templates/
  feature/
    branch-slug/
      prd.md
      adr.md
      notes.md
  bugfix/
    branch-slug/
      bugfix.md
      notes.md
  chore/
    branch-slug/
      notes.md
      adr.md
```

New raw unit directories are derived from branch names:

```txt
feature/main-layout          -> docs/raw/feature/main-layout/
bugfix/ability-trigger-order -> docs/raw/bugfix/ability-trigger-order/
chore/cross-agent-harness    -> docs/raw/chore/cross-agent-harness/
```

Historical date-prefixed units remain as legacy records.

## Unit Types

- `feature/`: product capability or user-facing workflow.
- `bugfix/`: defect investigation and correction.
- `chore/`: setup, repository hygiene, documentation, tooling, and maintenance.

## Feature Development Flow

1. Create or switch to `feature/<kebab-slug>`.
2. Run `npm run harness:start -- --title "Feature title"`.
3. Fill `docs/raw/feature/<kebab-slug>/prd.md`.
4. Fill `docs/raw/feature/<kebab-slug>/adr.md`.
5. Add to `notes.md` when implementation or
   verification details need to survive the session.
6. Run `npm run harness:ingest -- docs/raw/feature/<kebab-slug>`.
7. Run `npm run harness:check`.
8. In commits, reference the raw unit path in the message body or trailer.

## Rules

- Keep raw sources public-safe: no credentials, private account details,
  local-only clone commands, or unnecessary third-party source-code provenance.
- Once a PRD or ADR is accepted, prefer a superseding ADR or an added note over
  rewriting the accepted artifact.
- Keep `docs/wiki/index.md` thin. Put details here in raw units, not in the wiki.
- Use `docs/harness/` as the shared Codex/ClaudeCode process contract.
