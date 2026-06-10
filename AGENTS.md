# Poke Battle Quiz Agent Guide

This file is the project-local operating contract for `/Users/nhn/prvprjt/poke-battle-quiz`.
It inherits the parent workspace rule: answer in Korean honorifics and call the user `형님`.

## Project Intent

Build a daily Pokemon deduction quiz where the answer is a Pokemon and the player
reveals hints through battle-like commands instead of free-form questions.

The MVP is not a full battle simulator. It should use a small deterministic quiz
hint engine: commands emit events, abilities react through explicit hooks, and the
UI renders battle logs plus revealed hints.

## LLM Wiki Harness

This project uses the Karpathy-style LLM Wiki pattern.

- Raw sources are the durable source of truth under `docs/raw/`.
- Raw sources are grouped by branch-like work units under `docs/raw/feature/`,
  `docs/raw/bugfix/`, and `docs/raw/chore/`.
- Each raw work unit is a directory, not a loose session dump. Typical feature
  units contain `prd.md`, `adr.md`, and optional `notes.md`.
- The LLM-maintained wiki is intentionally thin: `docs/wiki/index.md` is the
  only always-loaded wiki page.
- `AGENTS.md` is the schema and routing contract that tells future agents how to
  use and maintain the wiki.

On session start:

1. Read `docs/wiki/index.md`.
2. Follow only the raw-unit links relevant to the task.
3. Read `prd.md` / `adr.md` before making product or architecture decisions.
4. Read `notes.md` only when implementation history or verification details are
   needed.

When to update the wiki:

- After a product decision, architecture decision, data import decision, or
  implementation milestone.
- After a meaningful debugging discovery or test/verification result.
- After a discussion that changes project direction.
- Before ending a long session if the next session would otherwise lose context.

Wiki maintenance rules:

- Raw units are public-safe and append-oriented. Once a PRD or ADR is accepted,
  prefer a superseding ADR or an added note over rewriting history.
- `docs/wiki/index.md` is navigation, not a synthesis dump. Keep it short:
  project direction plus categorized raw-unit links.
- Add new wiki pages only after an accepted raw ADR says the single index is no
  longer enough.
- Ingest is lightweight: when a raw unit is added, add or update one index line
  under the best category. Do not add frontmatter, sync logs, rebuild scripts, or
  stale-check machinery.
- Keep runtime logs, metrics, and OMX state out of `docs/raw/` and `docs/wiki/`.

## Raw Unit Templates

- `docs/raw/_templates/feature-prd.md`
- `docs/raw/_templates/feature-adr.md`
- `docs/raw/_templates/notes.md`
- `docs/raw/_templates/bugfix.md`
- `docs/raw/_templates/chore.md`

## Architecture Direction

Use this high-level shape unless a later wiki decision supersedes it:

```txt
src/domain/
  types.ts
  state.ts
  commands.ts
  battleReducer.ts
  hints.ts
  daily.ts
  rules/
  abilities/

src/data/
  curated/
  generated/

src/ui/
  CommandPanel.tsx
  BattleLog.tsx
  GuessBox.tsx
  DailyGame.tsx
```

Core engine boundary:

- React owns rendering and user interaction.
- `src/domain` owns serializable simulation state and pure reducers.
- Ability behavior is modeled as trigger effects, not as one-off conditionals in
  the reducer.
- Data import/generation belongs outside runtime UI.

## Verification

After code changes, run the relevant subset of:

```sh
npm run lint
npm run build
npm run test:run
```

For local UI checks:

```sh
npm run dev -- --host 127.0.0.1
```
