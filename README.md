# Poke Battle Quiz

포켓몬 배틀 형식을 빌린 1일 1문제 포켓몬 추리 퀴즈 사이트입니다.

핵심 아이디어는 하루에 하나의 공통 정답을 맞히되, 질문을 단순
텍스트가 아니라 배틀 커맨드로 수행하는 것입니다.

## Current Setup

- Vite
- React
- TypeScript
- Vitest
- ESLint

## Commands

```sh
npm install
npm run dev
npm run lint
npm run build
npm run test:run
```

개발 서버 기본 URL:

```txt
http://127.0.0.1:5173/
```

## Repository

- [rlatndud9090/poke-battle-quiz](https://github.com/rlatndud9090/poke-battle-quiz)

## Documentation

- [Agent guide](AGENTS.md): 프로젝트별 에이전트 운영 규칙과 LLM Wiki 진입점
- [LLM Wiki index](docs/wiki/index.md): LLM이 유지하는 프로젝트 지식 레이어
- [Raw note policy](docs/wiki/convention/raw-data-units.md): feature/bugfix/chore 단위 raw 기록 규칙

## Important Direction

초기 MVP는 풀 배틀 시뮬레이터가 아닙니다. React UI와 순수 TypeScript
룰 엔진을 분리하고, 퀴즈 힌트에 필요한 상호작용만 deterministic하게
처리합니다.

## Disclaimer

This is an unofficial fan project. It is not affiliated with Nintendo, Game Freak,
Creatures, or The Pokemon Company.

우선 구현할 커맨드:

- 특정 타입으로 공격하기
- 특정 상태이상 걸기
- 특정 기술을 가르칠 수 있는지 확인하기
- 특정 능력치를 상승/하락시키기

우선 구현할 특성 예시:

- Speed Boost
- Stamina
- Defiant
- Guts
- Contrary
- Clear Body / White Smoke
- Water Absorb / Volt Absorb / Flash Fire
- Levitate
