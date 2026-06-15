# Project Agent Guide

This project uses the shared LLM Project Harness mounted at `.harness`.
Answer in Korean by default unless the user asks otherwise.

## Project Intent

**Poke Battle Quiz (가칭)** — 하루 1회 정해진 포켓몬을 '배틀 형식' 행동으로 추론해 맞히는 데일리 퍼즐 웹.

- 유저는 결국 **포켓몬 이름 하나**만 맞히면 된다.
- 내부 정답 = `특정 포켓몬 + 그 포켓몬이 가질 수 있는 특성 중 하나`.
- 유저는 매 턴 하나의 **행동**(예: "불 타입 물리 기술로 공격")을 하고, **단순화된 배틀 엔진**이
  결과를 판정해 단서로 준다 — 데미지 배율, `x0` 무효(특성/면역 직접 유추), 능력 랭크 변화 등.
- 유저는 단서로 **타입·특성을 좁혀** 정답 포켓몬을 추론한다.

스택: React + TypeScript + Vite, 정적 호스팅. **정답 은닉 아키텍처 · 배틀 엔진 규칙 · 힌트 범위 ·
포켓몬 데이터 파이프라인은 후속 피처 브랜치에서 설계/구현한다.** 이번 초기 커밋은 컨셉 + 하네스 연결까지다.

배틀 규칙 참고: Pokémon Showdown, PokéRogue (`.reference-repos/`, 로컬 전용). 데일리 추론 UX 참고:
Pokémantle · Wordle · Semantle · 꼬맨틀 · 쌍근.

## Harness Entry Points

1. Read `docs/wiki/index.md`.
2. Read `.harness/harness/protocols/session-start.md`.
3. Follow only raw links relevant to the task.
4. Use `$next-feature` for open-ended product work.
5. Keep product-specific decisions in this project's `docs/raw/` and `docs/wiki/`.

Shared harness rules live in `.harness/harness/`. Root-level `.codex/`
and `.claude/` may contain symlinks to shared harness adapters plus
project-local skills or agents. Local project definitions are allowed and take
precedence when they occupy the same path.
