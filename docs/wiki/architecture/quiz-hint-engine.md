# Quiz Hint Engine

Status: active
Category: architecture
Last updated: 2026-06-09
Sources: `docs/raw/chore/2026-06-09-repository-bootstrap.md`

## Core Decision

The battle engine should be a deterministic hint engine, not a full Pokemon
battle simulator.

The engine should convert player commands into events, let ability hooks react,
apply resulting state changes, and produce hints plus battle log entries.

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

## Proposed Module Shape

```txt
src/domain/
  types.ts
  state.ts
  commands.ts
  battleReducer.ts
  hints.ts
  daily.ts
  rules/
    typeEffectiveness.ts
    statusRules.ts
    statStageRules.ts
    learnsetRules.ts
  abilities/
    registry.ts
    triggers.ts
```

## Ability Model

Abilities should be represented as definitions composed of one or more trigger
effects.

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

This avoids turning `battleReducer` into a long ability-specific conditional
chain. A single ability can own several effects.

## Initial Trigger Set

- `beforeMoveHit` - defensive immunity, redirection, absorption, or move-shape changes
- `afterMoveHit` - effects that care that a move connected
- `afterDamagingHit` - Stamina, Weak Armor, contact/damage reactions
- `beforeStatusApply` - status immunity, status reflection, replacement effects
- `afterStatusApply` - Synchronize-like follow-up and Guts observation hints
- `beforeStatChange` - Mirror Armor, Clear Body, White Smoke, Contrary
- `afterStatChange` - Defiant, Competitive-style follow-up
- `endTurn` - Speed Boost and other turn-end automatic effects
- `modifyProbeResult` - quiz-only modifiers that alter hint calculation without
  requiring full damage calculation

## Attempt vs Applied Events

State-changing interactions should be split into attempts and applied events.

For stat changes:

```txt
StatChangeAttempt
-> beforeStatChange hooks may cancel, reflect, or transform it
-> StatChangeApplied
-> afterStatChange hooks may react
```

This is essential for abilities such as Mirror Armor, Clear Body, Contrary, and
Defiant.

## Example Ability Mapping

- Speed Boost: `endTurn -> Speed +1`
- Stamina: `afterDamagingHit && causedDamage -> Defense +1`
- Weak Armor: `afterDamagingHit && move.category === physical -> Defense -1, Speed +2`
- Mirror Armor: `beforeStatChange && source is opponent && stage < 0 -> cancel original, emit reflected stat drop to source`
- Defiant: `afterStatChange && target had stat lowered by opponent -> Attack +2`
- Guts: `modifyProbeResult` and/or `afterStatusApply` to reveal that burn attack
  reduction is bypassed and Attack is empowered while statused

## Event Cause

Every emitted event should carry a cause so reflection and chained abilities can
avoid loops.

```ts
type EffectCause = {
  kind: 'command' | 'ability' | 'system'
  id: string
  source?: BattlerId
}
```

For example, a Mirror Armor-reflected stat drop should carry an ability cause so
it does not reflect again forever.

## Test Shape

The first reducer tests should lock:

- Type effectiveness hint.
- Speed Boost end-turn trigger.
- Stamina after damaging hit.
- Weak Armor physical-only trigger.
- Mirror Armor stat-drop reflection.
- Defiant reaction to opponent-caused stat drop.
- Guts interaction with burn-style attack reduction.
