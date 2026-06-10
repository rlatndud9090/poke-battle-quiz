# Notes: Repository Bootstrap

Date: 2026-06-09 Asia/Seoul
Unit type: chore
Status: done

## Context

- The project was initialized as a Vite React TypeScript app.
- ESLint and Vitest were configured.
- The product direction was captured as a daily Pokemon-themed battle quiz.

## Decisions

- Keep MVP implementation small and local.
- Separate React UI from pure domain rules.
- Keep generated or curated data outside runtime UI concerns.

## Verification

- `npm run lint`
- `npm run build`
- `npm run test:run`
