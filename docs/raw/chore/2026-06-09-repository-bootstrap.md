# Raw Chore: 2026-06-09 Repository Bootstrap

Date: 2026-06-09 Asia/Seoul
Unit type: chore
Status: public-safe summary

## Context

The project was initialized as a Vite React TypeScript app for a daily
Pokemon-themed deduction quiz.

## Captured Facts

- Stack: Vite, React, TypeScript, ESLint, Vitest.
- The game concept is a daily shared-answer deduction quiz.
- The answer is a Pokemon.
- Players reveal hints through battle-like commands rather than arbitrary text
  questions.
- MVP persistence can use localStorage.
- The MVP should not implement a full battle simulator.
- The core runtime should be a deterministic hint engine with command events,
  ability hooks, revealed hints, and battle log entries.

## Initial Architecture Direction

- React renders state and dispatches commands.
- Pure TypeScript domain modules own quiz state transitions.
- Ability behavior should be modeled with trigger effects.
- Generated or curated data should stay separate from runtime UI code.
