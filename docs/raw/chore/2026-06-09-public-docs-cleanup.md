# Raw Chore: 2026-06-09 Public Docs Cleanup

Date: 2026-06-09 Asia/Seoul
Unit type: chore
Status: public-safe summary

## Context

The user requested cleanup of files that did not need to live in the public
remote repository.

## Captured Decisions

- Raw notes are now managed in branch-like work units under:
  - `docs/raw/feature/`
  - `docs/raw/bugfix/`
  - `docs/raw/chore/`
- Public docs should not preserve unnecessary details about local reference
  sources or temporary handoff files.
- Public docs should keep the product intent, architecture decisions, wiki
  operating model, and repository state.

## Cleanup Scope

- Remove local/tooling config that is not needed by other agents.
- Remove standalone handoff and research docs.
- Sanitize wiki/raw pages so they keep durable decisions without exposing
  unnecessary source-code provenance.
