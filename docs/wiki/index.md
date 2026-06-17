# Project Wiki Index

> 이 문서는 항상 로딩되는 유일한 LLM Wiki 페이지다. 프로젝트 방향과 raw work
> unit 링크만 제공한다. 종합 요약 문서로 키우지 않는다.

Last updated: 2026-06-15 Asia/Seoul

## Direction

- **무엇:** 하루 1회 정해진 포켓몬을 '배틀 형식' 행동으로 추론해 맞히는 데일리 퍼즐 웹
  (**Poke Battle Quiz**, 가칭). 유저는 포켓몬 이름만 맞히면 되고, 내부 정답은
  `포켓몬 + 가능 특성 하나`. 매 턴 행동 → 단순화 배틀엔진 판정(데미지 배율 / `x0` 무효 /
  능력 랭크 변화)으로 타입·특성을 좁혀 추론한다.
- **대상:** 포켓몬 배틀 메커니즘에 익숙한 팬 + 데일리 퍼즐(워들/세맨틀류) 유저.
- **스택:** React + TypeScript + Vite, 정적 호스팅. 정답 은닉 아키텍처 · 배틀 엔진 · 힌트 범위는
  후속 피처 브랜치에서 설계.
- **Knowledge boundary:** raw PRD/ADR/notes가 진실 원천이고, 이 index는 navigation만 맡는다.

## Raw Units

> 아직 정식 raw unit이 없다. 첫 작업은 피처 브랜치에서
> `npm run harness:kickoff -- --type feature --slug <slug> --title "<제목>"` 으로 생성한다.

### Product & Architecture
- **포켓몬 데이터 계약(타입 상성표 · 종족→특성 매핑) 정의 및 전 세대 시드** — [PRD](../raw/feature/pokemon-data-contract/prd.md) · [ADR](../raw/feature/pokemon-data-contract/adr.md) · [Notes](../raw/feature/pokemon-data-contract/notes.md)

### Project Operations

## Maintenance

- 새 raw work unit은 `docs/raw/{feature,bugfix,chore}/branch-slug/` 아래에 둔다.
- raw unit을 추가하면 `npm run harness:ingest -- docs/raw/<type>/<slug>`를 실행한다.
