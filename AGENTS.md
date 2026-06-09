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

- Raw sources are append-only project memory under `docs/raw/`.
- Raw sources are grouped by branch-like work units:
  `docs/raw/feature/`, `docs/raw/bugfix/`, and `docs/raw/chore/`.
- The LLM-maintained wiki lives under `docs/wiki/`.
- `docs/wiki/index.md` is the first wiki file to read in every new session.
- `docs/wiki/log.md` is the chronological maintenance ledger.
- `AGENTS.md` is the schema and routing contract that tells future agents how to
  use and maintain the wiki.

On session start:

1. Read `docs/wiki/index.md`.
2. Read `docs/wiki/log.md`.
3. Read any linked wiki pages relevant to the task before making architectural
   or product decisions.
4. Read relevant raw notes under `docs/raw/<unit-type>/` only when the compiled
   wiki needs source-level context.

When to update the wiki:

- After a product decision, architecture decision, data import decision, or
  implementation milestone.
- After a meaningful debugging discovery or test/verification result.
- After a discussion that changes project direction.
- Before ending a long session if the next session would otherwise lose context.

Wiki maintenance rules:

- Preserve raw sources. Do not rewrite existing raw files; add a new raw note
  when context changes or a correction is needed.
- Create raw notes per feature, bugfix, or chore unit. Do not create one large
  session dump when a smaller unit note will preserve the decision cleanly.
- Keep wiki pages concise, linked, and evidence-aware.
- Separate evidence from inference. Cite local files, raw notes, or web sources
  where possible.
- Update `docs/wiki/index.md` whenever a durable page is added, renamed, or
  materially changes status.
- Append `docs/wiki/log.md` for every wiki ingest or meaningful maintenance pass.
- Prefer `[[wiki-link]]` style links between wiki pages.
- Keep runtime logs, metrics, and OMX state out of the wiki unless they contain a
  durable project decision.

## Current Wiki Entry Points

- `docs/wiki/index.md`
- `docs/wiki/architecture/project-overview.md`
- `docs/wiki/architecture/quiz-hint-engine.md`
- `docs/wiki/decision/llm-wiki-harness.md`
- `docs/wiki/convention/raw-data-units.md`
- `docs/wiki/reference/llm-wiki-pattern.md`
- `docs/wiki/session-log/2026-06-09-context-bootstrap.md`

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
