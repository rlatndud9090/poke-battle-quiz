---
title: "Intake helper harness"
date: "2026-06-10"
status: done # draft | done | rejected
unit_type: chore
---

# Chore: Intake helper harness

## Context

The existing cross-agent harness controls work after a branch-shaped raw unit
exists. The missing lightweight layer is intake: turning "이제 뭐하지?" or a
broad idea into candidate work units and a PRD draft.

## Scope

- In scope: shared intake and PRD-drafting protocols, role prompts, and
  Codex/ClaudeCode adapters.
- Out of scope: scripts for automatic prioritization or branch creation.

## Decisions

- Add shared `work-intake` and `prd-drafting` protocols under `docs/harness/`.
- Add `intake-helper`, `unit-planner`, and `prd-writer` roles.
- Keep the first version documentation-only. Do not add scripts until the intake
  pattern proves repetitive enough to automate.
- Add Codex and ClaudeCode adapters that point back to the shared protocols.

## Verification

- `npm run harness:check`
- `npm run harness:gate`
