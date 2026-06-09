# Raw Source: 2026-06-09 Session Bootstrap

Date: 2026-06-09 Asia/Seoul
Source type: conversation capture plus existing project docs
Status: raw, append-only

## Project Setup Context

The project was initialized as a Vite React TypeScript app. The current stack is
Vite 8, React 19, TypeScript 6, ESLint 10, and Vitest 4.

The initial setup handoff says the intended product is a daily Pokemon deduction
quiz. The answer is a Pokemon. The player should not simply guess names at the
start; instead, they use battle-style commands to reveal hints.

Important existing docs:

- `docs/session-handoff.md`
- `docs/data-sources.md`
- `README.md`

## Product Intent Captured

The game should feel related to Wordle, Semantle, and Pokemantle: one shared
daily answer, persistent personal progress, and a compact share/result loop.

The differentiator is that the usual twenty-questions loop becomes Pokemon
battle-style commands. Type interactions, statuses, stat-stage changes, abilities,
and learnset probes become the hint vocabulary.

MVP persistence can use localStorage. Backend hiding, cross-device sync,
anti-cheat, global rankings, and public leaderboards can wait.

## Data Source Context

Pokemon Showdown is the primary battle-data reference for types, abilities,
moves, learnsets, conditions, and mechanics.

PokeAPI is the secondary source for API-shaped Pokemon metadata, localized names,
and sprite URLs.

PokeRogue is useful as an ability architecture and battle-flow reference, but its
AGPL license means implementation code should not be copied into this project
unless the project intentionally accepts that license consequence.

## Battle Engine Discussion

The project should not implement heavy Pokemon damage calculation or a full
battle simulator. The useful center is a deterministic quiz hint engine.

The proposed engine shape:

```txt
Command
-> intent events
-> ability hooks
-> applied events
-> state patch
-> hints
-> battle log
```

The user emphasized that ability application must be designed carefully because
Pokemon abilities have many possible triggers:

- Speed Boost activates automatically at end of turn.
- Stamina activates when damage is received.
- Weak Armor activates only when a physical attack is received.
- Mirror Armor-style behavior requires reflecting stat drops before they apply.

The resulting design direction is an event queue plus ability trigger registry.
Abilities should be modeled as one or more trigger effects, not as a giant
conditional block in the reducer.

## LLM Wiki Adoption

The user requested a Karpathy-style LLM Wiki pattern for this project:

- Conversations, discussions, and decisions should accumulate as raw data.
- An LLM-writable wiki layer should maintain project understanding.
- The top-level `AGENTS.md` should index the wiki so future sessions can follow
  development history, structure, and context.

This raw note was created as the first source for that wiki layer.
