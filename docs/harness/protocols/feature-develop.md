# Feature Develop Protocol

This is the shared feature workflow for Codex and ClaudeCode.

## Entry

Input is a branch-derived raw unit:

```txt
docs/raw/feature/<slug>/
```

The feature unit must have `prd.md` and `adr.md` before implementation. `notes.md`
is used for durable implementation and verification notes.

## Flow

1. Session start: read `AGENTS.md`, `docs/wiki/index.md`, and the feature raw
   unit.
2. Architect: confirm scope, write or update the ADR while it is still proposed,
   and define the implementation boundary.
3. Domain engineer: implement deterministic quiz engine behavior under
   `src/domain`.
4. UI engineer: implement React surfaces under `src/ui` or existing app
   boundaries.
5. Test engineer: add or update reducer, effect, and UI tests according to risk.
6. Integrator: run `wiki-ingest`, `artifact-check`, lint, build, tests, and the
   commit protocol.

## Boundaries

- The MVP is not a full battle simulator.
- Ability behavior should use trigger/effect hooks rather than scattered
  conditionals.
- React owns rendering. `src/domain` owns serializable state and pure reducers.
- Public docs must not preserve unnecessary third-party source provenance.
