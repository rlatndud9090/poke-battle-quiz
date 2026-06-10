---
title: "Start with a local daily quiz prototype"
date: "2026-06-09"
status: accepted
related_prd: "./prd.md"
unit_type: feature
supersedes:
---

# ADR: Start With A Local Daily Quiz Prototype

## Context

The project needs to prove the core loop before investing in data completeness,
backend validation, anti-cheat, or cross-device sync.

## Decision

Build the first MVP as a local React app with localStorage-backed progress and a
small curated data set.

## Alternatives

- Backend-first validation: rejected for the prototype because it adds delivery
  cost before the hint loop is proven.
- Complete data import first: rejected because the game can be evaluated with a
  curated subset.

## Consequences

### Positive

- Low implementation cost.
- Fast iteration on command and hint readability.
- No production service dependency.

### Negative / Trade-Offs

- The answer is not securely hidden.
- Cross-device sync and public ranking wait for a later milestone.

## Verification

- Build a playable daily loop.
- Verify refresh persistence.
- Verify personal stats update locally.
