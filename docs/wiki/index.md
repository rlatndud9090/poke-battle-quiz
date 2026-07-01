# 프로젝트 Wiki — 방향성 & 문서 네비게이션

> 이 한 장은 에이전트가 작업 시작 시 로드하는 **얇은 네비게이션 인덱스**다.
> 프로젝트 방향성을 짧게 제시하고, 모든 raw work unit(PRD/ADR/Bugfix/Notes)으로
> 가는 카테고리별 링크를 제공한다. 상세 종합본은 두지 않으며, 깊이 들어갈 때는
> 링크된 raw 문서를 직접 Read해 능동 탐색한다.
>
> 갱신: 새 raw unit 추가 시
> `npm run harness:ingest -- docs/raw/<type>/<slug> --category "<분류>"`로 해당
> 링크를 카테고리에 증분 추가한다.

## 큰 방향성

- **무엇**: 하루 1회 정해진 포켓몬을 '배틀 형식' 행동으로 추론해 맞히는 데일리 퍼즐 웹
  (**Poke Battle Quiz**, 가칭). 유저는 포켓몬 이름 하나만 맞히고, 내부 정답은
  `포켓몬 + 가능 특성 하나`다.
- **누구를 위해**: 포켓몬 배틀 메커니즘에 익숙한 팬과, 워들·세맨틀류 데일리 추론
  게임을 즐기는 유저를 위해 만든다.
- **핵심 경험 / 목표**: 매 턴 행동을 고르고, 단순화된 배틀 판정(데미지 배율 / `x0`
  무효 / 능력 랭크 변화)으로 타입·특성을 좁혀 정답 포켓몬을 추론하는 경험을 만든다.
- **어떻게**: React + TypeScript + Vite 기반의 정적 호스팅 앱으로 구현한다. 데이터
  계약, 배틀 판정 엔진, 데일리 세션/정답 은닉이 headless 도메인으로 쌓이고, 플레이 UI가
  그 위를 소비한다.
- **지식 경계**: raw PRD/ADR/notes가 진실 원천이고, 이 index는 navigation만 맡는다.

## Raw Units (카테고리별)

각 항목은 raw source(PRD/ADR/Bugfix/Notes)로의 링크다. 카테고리는 네비게이션
라벨일 뿐이며, 상세는 링크된 문서를 직접 Read한다.

카테고리 설계 원칙:

- feature 카테고리 이름과 분류축은 이 프로젝트가 소유한다.
- feature는 `아키텍처`, `기능`, `기타`, `Product & Architecture` 같은 큰 바구니에 넣지 않는다.
- 새 feature를 ingest할 때는 반드시 `--category`로 프로젝트에 맞는 분류를 명시한다.
- 해당 카테고리가 아직 없으면 ingest가 새 `###` 헤딩을 자동으로 추가한다.

### 데이터 파이프라인

- **포켓몬 데이터 계약(타입 상성표 · 종족→특성 매핑) 정의 및 전 세대 시드** — [PRD](../raw/feature/pokemon-data-contract/prd.md) · [ADR](../raw/feature/pokemon-data-contract/adr.md) · [Notes](../raw/feature/pokemon-data-contract/notes.md)

### 배틀 판정 규칙

- **배틀 판정 엔진** — [PRD](../raw/feature/battle-judgment-engine/prd.md) · [ADR](../raw/feature/battle-judgment-engine/adr.md) · [Notes](../raw/feature/battle-judgment-engine/notes.md)

### 데일리 게임 루프

- **추측/피드백 계약 및 정답 은닉 아키텍처** — [PRD](../raw/feature/guess-feedback-contract/prd.md) · [ADR](../raw/feature/guess-feedback-contract/adr.md) · [Notes](../raw/feature/guess-feedback-contract/notes.md)
- **패널 플립 데일리 퀴즈 코어** — [PRD](../raw/feature/panel-flip-daily-quiz/prd.md) · [ADR](../raw/feature/panel-flip-daily-quiz/adr.md) · [Notes](../raw/feature/panel-flip-daily-quiz/notes.md)

### 프로젝트 운영

- **포켓몬 데이터 폼 누수·이름 충돌·캐시 키 수정(PR #1 리뷰 반영)** — [Bugfix](../raw/bugfix/pokemon-data-form-fixes/bugfix.md)
- **하네스 최신화 및 wiki taxonomy 개정** — [Notes](../raw/chore/harness-wiki-taxonomy-update/notes.md)
- **하네스 서브모듈 최신화** — [Notes](../raw/chore/harness-submodule-update/notes.md)

## Maintenance

- 새 raw work unit은 `docs/raw/{feature,bugfix,chore}/branch-slug/` 아래에 둔다.
- raw unit을 추가하면 `npm run harness:ingest -- docs/raw/<type>/<slug> --category "<분류>"`를 실행한다.
- wiki는 single index를 유지하고, 상세 설명은 raw 문서에 남긴다.
