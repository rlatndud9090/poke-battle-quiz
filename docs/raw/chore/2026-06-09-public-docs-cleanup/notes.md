# Notes: Public Docs Cleanup

Date: 2026-06-09 Asia/Seoul
Unit type: chore
Status: done

## Context

Public documentation was cleaned so the repository keeps durable project memory
without preserving unnecessary local setup or source provenance.

## Decisions

- Keep public docs focused on product intent, architecture decisions, raw policy,
  and repository state.
- Keep local runtime/tooling details out of tracked documentation unless they
  affect future project work.
- Keep raw notes public-safe.

## Verification

- Public keyword scan.
- Wiki link check.
- `npm run lint`
- `npm run build`
- `npm run test:run`
