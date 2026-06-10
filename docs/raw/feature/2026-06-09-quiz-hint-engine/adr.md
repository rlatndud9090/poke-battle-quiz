---
title: "Use an event-driven quiz hint engine"
date: "2026-06-09"
status: accepted
related_prd: "./prd.md"
unit_type: feature
supersedes:
---

# ADR: Use An Event-Driven Quiz Hint Engine

## Context

The game should feel battle-like, but it does not need heavy battle simulation.
The hard part is ability timing: some effects happen at turn end, some after
damage, some before stat changes, and some as follow-up reactions.

## Decision

Build a deterministic hint engine around commands, events, ability trigger
effects, state patches, hints, and battle logs.

```txt
Command
-> command validation
-> intent events
-> ability hooks
-> applied events
-> state patch
-> revealed hints
-> battle log
```

Abilities are definitions composed of one or more trigger effects.

```ts
type AbilityDefinition = {
  id: AbilityId
  name: string
  effects: AbilityEffect[]
}

type AbilityEffect = {
  trigger: AbilityTrigger
  priority?: number
  condition?: AbilityCondition
  apply: AbilityEffectHandler
}
```

## Initial Trigger Set

- `beforeMoveHit`
- `afterMoveHit`
- `afterDamagingHit`
- `beforeStatusApply`
- `afterStatusApply`
- `beforeStatChange`
- `afterStatChange`
- `endTurn`
- `modifyProbeResult`

## Attempt vs Applied Events

State-changing interactions should split attempts from applied events.

```txt
StatChangeAttempt
-> beforeStatChange hooks may cancel, reflect, or transform it
-> StatChangeApplied
-> afterStatChange hooks may react
```

## Alternatives

- Full battle simulator: rejected because the MVP needs hint readability, not
  complete battle fidelity.
- Ability-specific reducer conditionals: rejected because the reducer would grow
  brittle as trigger types expand.

## Consequences

### Positive

- Ability behavior remains modular.
- Engine tests can target event outcomes.
- React stays a rendering layer.

### Negative / Trade-Offs

- Some real battle mechanics will be simplified or omitted.
- Ability coverage requires curated trigger design.

## Verification

- Type effectiveness hint test.
- End-turn trigger test.
- Damage-reaction trigger test.
- Stat-change attempt/applied trigger tests.
