---
title: "Quiz hint engine foundation"
date: "2026-06-09"
status: approved
unit_type: feature
---

# PRD: Quiz Hint Engine Foundation

## Problem

Pokemon abilities and battle interactions have many trigger shapes. The project
needs an extensible hint engine without implementing full damage and battle
simulation.

## Goals

- Model player commands as deterministic quiz events.
- Let abilities react through explicit trigger effects.
- Produce revealed hints and battle log entries from applied events.
- Keep the engine pure and testable outside React.

## Non-Goals

- Full damage formula.
- Full turn order, PP, items, weather, terrain, switching, double battles, or AI.
- Complete ability coverage in the first prototype.

## Requirements

- [ ] Support command validation and event emission.
- [ ] Support attempt and applied phases for state-changing interactions.
- [ ] Support ability triggers such as end-turn, after-damage, before-stat-change,
      and after-stat-change.
- [ ] Emit public hints and log entries separately from internal events.

## Acceptance Criteria

- [ ] Type effectiveness hints can be tested.
- [ ] End-turn automatic effects can be tested.
- [ ] Damage-reaction effects can be tested.
- [ ] Stat-change prevention, inversion, reflection, and follow-up effects can be
      represented without reducer-specific conditionals.

## Links

- ADR: `./adr.md`
