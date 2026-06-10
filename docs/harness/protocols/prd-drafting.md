# PRD Drafting Protocol

Use this after work intake selects a candidate.

The goal is to create a strong PRD draft that a human can approve or edit before
implementation.

## Input

- Accepted work-unit candidate.
- Relevant raw PRD/ADR files.
- Current product direction from `docs/wiki/index.md`.

## Output

Draft these sections:

- Problem
- Goals
- Non-Goals
- Requirements
- Acceptance Criteria
- Open Questions

The draft must be specific enough for `harness:start` and feature development.

## Rules

- Keep requirements observable.
- Separate product goals from implementation details.
- Record unresolved uncertainty as open questions, not hidden assumptions.
- If the candidate is architectural, also flag whether an ADR is required.
- For quiz features, describe the player-facing quiz experience and the data or
  domain behavior needed to support it.

## Handoff

When the user approves the draft:

```sh
npm run harness:start -- --type <type> --slug <slug> --title "<title>"
```

Then fill the created raw artifact with the approved draft and run:

```sh
npm run harness:ingest -- docs/raw/<type>/<slug>
npm run harness:check
```
