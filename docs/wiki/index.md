# Poke Battle Quiz LLM Wiki

Last updated: 2026-06-09 Asia/Seoul

This is the maintained LLM-written knowledge layer for the project. Raw sources
remain under `docs/raw/`; this wiki compiles them into durable project context.

## Read First

- [[architecture/project-overview]] - product intent, current stack, and MVP boundary
- [[architecture/quiz-hint-engine]] - event-driven hint engine and ability trigger design
- [[decision/llm-wiki-harness]] - why and how this wiki is maintained
- [[convention/raw-data-units]] - feature/bugfix/chore raw note policy
- [[reference/llm-wiki-pattern]] - researched summary of Karpathy's LLM Wiki pattern
- [[environment/github-publication]] - public GitHub repository publication state
- [[session-log/2026-06-09-context-bootstrap]] - first captured session context

## Raw Source Inventory

- `docs/raw/README.md` - raw note structure and public-safety rules
- `docs/raw/chore/2026-06-09-repository-bootstrap.md` - initial public-safe project setup context
- `docs/raw/chore/2026-06-09-github-publication.md` - public GitHub repository publication facts
- `docs/raw/chore/2026-06-09-public-docs-cleanup.md` - public documentation cleanup decisions

## Existing Non-Wiki Docs

- `README.md` - user-facing project overview and commands

## Current Decisions

- Use localStorage for the MVP daily puzzle state and personal stats.
- Do not build a full Pokemon battle simulator for the MVP.
- Build a deterministic quiz hint engine around commands, events, ability hooks,
  hints, and battle logs.
- Maintain project memory through this LLM Wiki, with `AGENTS.md` as the schema.
- Keep raw notes grouped by feature, bugfix, or chore units.
- Published the project as public `rlatndud9090/poke-battle-quiz`.

## Page Categories

- `architecture/` - system shape, boundaries, and durable technical models
- `decision/` - accepted decisions and rejected alternatives
- `environment/` - local setup, hosting, accounts, and repository state
- `convention/` - project process and maintenance rules
- `reference/` - external or local research summaries
- `session-log/` - compact chronological session records
- `docs/raw/` - append-only source notes grouped by unit type
- `templates/` - page templates for future maintenance

## Maintenance Checklist

- Add a raw note before compiling major new context.
- Update or add the smallest relevant durable page.
- Update this index when navigation changes.
- Append `log.md` with the maintenance action.
- Cite local files, raw notes, or web URLs for factual claims.
