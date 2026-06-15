# Poke Battle Quiz (가칭)

하루에 한 번, 정해진 포켓몬을 **'배틀'로 추론해** 맞히는 데일리 퍼즐 웹.

## 컨셉

- 유저는 결국 **포켓몬 이름 하나**만 맞히면 된다.
- 내부적으로 오늘의 정답은 `특정 포켓몬 + 그 포켓몬이 가질 수 있는 특성(ability) 중 하나` 이다.
- 유저는 매 턴 하나의 **행동(action)** 을 수행한다. 예: *"불 타입 물리 기술로 공격"*.
- **단순화된 배틀 엔진**이 그 행동의 결과를 판정해 단서로 보여준다:
  - **데미지 배율** — `x0.25 / x0.5 / x1 / x2 / x4` 등 (타입 상성 추론)
  - **무효화** — `x0` 으로만 표시. 타입 면역인지 *특성에 의한 무효*인지는 직접 유추
  - **능력 랭크 변화** — 예: `방어 -1, 스피드 +2` → '깨어진 갓옷' 특성 추론
- 유저는 이 단서들을 모아 **타입과 특성을 좁혀** 정답 포켓몬을 추론한다.

### 예시 흐름

```
턴 1) 행동: "땅 타입 물리 기술로 공격"   → 결과: x0     (비행 타입? 부유 특성? 둘 중 하나)
턴 2) 행동: "전기 타입 특수 기술로 공격" → 결과: x2     (비행 타입 유력 — 부유라면 전기는 x1)
턴 3) 행동: "물리 기술로 공격"           → 결과: 방어 -1, 스피드 +2 (깨어진 갓옷!)
...   단서 종합 → 후보를 좁혀 포켓몬 이름 제출
```

> 위 수치는 컨셉 설명용 예시이며, 실제 배틀 엔진 규칙·정답 은닉 방식·힌트 범위는 후속 피처 브랜치에서 설계한다.

## 레퍼런스

- **배틀 메커니즘**: [Pokémon Showdown](https://pokemonshowdown.com/), [PokéRogue](https://pokerogue.net/) — full 배틀 엔진을 그대로 차용하지는 않고, 타입 상성·랭크 변화·특성 판정 규칙을 참고한다.
- **데일리 퍼즐 / 추론 UX**: Pokémantle, Wordle, Semantle, 꼬맨틀, 쌍근 — 1일 1회 정답 결정·치팅 방지·힌트 피드백 방식을 비교 조사했다. (정답 은닉 아키텍처 결정은 후속 피처 브랜치)
- **로컬 레퍼런스**: `.reference-repos/` 에 pokemantle · pokemon-showdown · pokerogue 클론을 둔다. **git 비추적(로컬 전용)** 으로, 원격에는 올리지 않는다.

## 기술 스택

- **React 19 + TypeScript + Vite**
- 배포: 정적 호스팅 (정답 은닉 방식은 추후 결정 — 순수 정적 / Edge Function 등)

## 개발 워크플로 (LLM Project Harness)

이 저장소는 공용 [LLM Project Harness](https://github.com/rlatndud9090/llm-project-harness)를 `.harness` git submodule 로 장착한다.

- 세션 시작: `docs/wiki/index.md` → `.harness/harness/protocols/session-start.md`
- 새 작업: 피처 브랜치 + `npm run harness:kickoff` 으로 raw 골격 생성

### 명령어

```sh
npm install            # 의존성 설치
npm run dev            # 개발 서버
npm run build          # 타입체크 + 프로덕션 빌드
npm run lint           # ESLint
npm run test           # vitest (watch) / npm run test:run (1회)

npm run harness:check  # 하네스 아티팩트 정합성 검사
npm run harness:gate   # harness:check → lint → build → test:run 순차 실행
npm run harness:kickoff -- --type feature --slug <slug> --title "<제목>"
```

## 디렉토리 구조

```txt
.harness/           공용 하네스 (git submodule, commit pin)
.reference-repos/   레퍼런스 클론 (로컬 전용, git 비추적)
docs/
  raw/              프로젝트 소유 raw PRD/ADR/notes
  wiki/index.md     항상 로딩되는 얇은 wiki 인덱스
src/                React 앱 소스
AGENTS.md           프로젝트 에이전트 가이드
```

## 현재 상태

초기 부트스트랩 단계 — **컨셉 정립 + 하네스 연결**까지 완료. 배틀 엔진 구현, 정답 은닉 아키텍처, 힌트 설계, 포켓몬 데이터 파이프라인은 후속 피처 브랜치에서 진행한다.
