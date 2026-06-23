---
title: "추측/피드백 계약 및 정답 은닉 아키텍처"
date: "2026-06-19"
status: accepted # proposed | accepted | deprecated | superseded
approval: "user:2026-06-19:형님 명시 승인 (정적 SPA·provider C·전단사 데일리·하루1판·균등 분포)"
related_prd: "./prd.md"
unit_type: feature
branch: "feature/guess-feedback-contract"
raw_path: "docs/raw/feature/guess-feedback-contract"
supersedes:
---

# ADR: 추측/피드백 계약 및 정답 은닉 아키텍처

## 컨텍스트

어떤 상황에서 이 결정이 필요했는가?

배틀 판정 엔진(`src/engine`)이 머지되어 **단서 생성**(`judge`/`entryClues` → `Clue`)은 확보됐다. 그러나 게임을 "성립"시키는 **데일리 루프** — 오늘의 정답 선정 · 세션(누적 단서·이동(move)·추측) · 이름 추측 판정/피드백 — 이 비어 있다. 이 계층이 엔진의 `Clue`를 소비해 한 판의 게임을 만든다. 핵심 결정은 (1) 정답 은닉을 서버로 빼느냐/정적 SPA로 탈취를 감수하느냐, (2) 그 위에서 정답 제공을 어떤 경계로 격리하느냐, (3) 데일리 정답을 어떤 PRNG로 결정하느냐, (4) 도메인/상태를 어디에 두느냐다.

- **PRD 요구:**
  - **데일리 정답 선정**(날짜 시드 결정론, candidate + ability까지) + **세션 상태**(누적 `Clue` 로그·move 수·`진행`/`해결`) + **행동→단서**(엔진 래핑) + **이름 추측 판정/피드백**을 **headless 도메인**으로 제공한다(UI는 `battle-turn-ui` 소관).
  - **정답 비노출(인터페이스/직렬화 경계 한정)**: 게임이 `진행`인 동안 provider 반환 객체·세션 직렬화에 정답의 `candidateId`/`nameKo`/`abilityId`가 부재해야 한다(해결 후에만 공개).
  - **추측 무제한 + 행동·이름추측 통합 1-move 카운트 + 정답까지의 move 수를 점수로 기록**(포케맨틀식). `실패` 상태 없음(정답 시에만 종료).
  - **순수·결정론·정적**: 런타임 외부 fetch 0, 정적 import만, Vitest 완결 검증.
  - **단방향 의존**: `src/data`(현재 후보 1209)·`src/engine`을 소비하고 역참조 금지.
- **현재 코드/데이터 제약:**
  - 엔진 계약은 호출마다 `Secret`(= `candidate: Candidate` + `ability: Ability`)을 **인자로** 받는다(`judge(action, secret)` / `entryClues(secret)`, `src/engine/types.ts`). 따라서 정답을 쥐고 엔진을 호출하는 주체가 어딘가에 반드시 있어야 하며, 그 주체가 곧 은닉 경계의 후보다.
  - 데이터 단일 출처(`src/data`)는 현재 **1209 후보**(`meta.json.totalCandidates`)이며 모수는 데이터가 단일 권위다(코드는 `N = candidates.length`로 읽고 상수 하드코딩 금지).
  - 후보군이 작아(~1209) 정적 호스팅만으로는 진짜 은닉 불가(전수 선계산·번들 추출로 무력) — 레퍼런스 조사(`notes.md` 「레퍼런스 조사」 갈래 3) 적대적 검증 결론.
- **사용자 경험 제약:**
  - **형님 결정: Squirdle처럼 정적 SPA로 간다 — v1은 정답 탈취를 감수한다.** 진짜 은닉(서버/Edge Function/KV)은 v1 비목표. 동형 인기작 Squirdle이 순수 클라 판정·로컬 상태로 운영되는 선례가 풀서버 과투자를 경계하게 한다.
  - 점수 모델은 포케맨틀식("몇 번 만에 맞췄나") — 많은 추측은 점수 페널티로 자기억제되므로 별도 횟수 제한이 불필요하다.
- **검증 제약:** 도메인 핵심은 I/O·전역 가변 상태 없이 순수해야 Vitest로 데일리 결정론·타임존 경계·세션 누적·추측 판정·move 점수·**정답 비노출 불변식**을 결정론적으로 덮을 수 있다. localStorage 접근은 얇은 영속 어댑터로 분리해 도메인 코어를 테스트 가능하게 한다.

## 결정

무엇을 결정했는가?

형님 승인(정적 SPA·탈취감수·무제한 추측·포케맨틀식 move 점수) 하에, 데일리 게임 루프를 **headless 도메인 모듈 `src/session/`**로 두고 다음 세 축을 채택한다.

**(1) Clue-only provider 경계 채택(선택지 C, 로컬 구현).** v1은 정답 `Secret`을 **provider 내부에 가두는 얇은 인터페이스**를 둔다. provider가 엔진 호출(`judge`/`entryClues`)을 캡슐화해 `행동→Clue[]`·`추측→결과`만 노출하고, 정답 식별자(`candidateId`/`nameKo`/`abilityId`)는 **해결 전까지** provider 응답·세션 직렬화에 담지 않는다. v1 구현체는 로컬(정적·결정론)이고, 미래 은닉이 필요해지면 **같은 인터페이스의 Edge Function 어댑터로 교체**한다. provider 인터페이스 형태(인라인 짧은 타입 리터럴 가드를 피해 멀티라인으로 펼친다):

```ts
// 정답이 아직 안 풀린 동안에는 식별자가 절대 빠져나오지 않는 결과 타입.
export interface ActionResult {
  clues: readonly Clue[];      // 엔진이 낸 단서만
}

export interface GuessResult {
  correct: boolean;
  // correct === true 일 때만 채워지는 공개 페이로드(해결 전에는 undefined).
  // nameKo = 정답 candidate의 한국어명, abilityId = ability.id (data Ability엔 nameKo 없음).
  revealed?: {
    candidateId: string;
    nameKo: string;
    abilityId: string;
  };
}

// 정답 Secret을 내재해 엔진 호출을 캡슐화하는 전송 경계.
export interface AnswerProvider {
  entryClues(): readonly Clue[];                  // 등장 단서(시작 1회)
  submitAction(action: Readonly<Action>): ActionResult;
  submitGuess(candidateId: string): GuessResult;  // id 비교만, 정답 식별자 비노출
}

// 팩토리는 "게임 날짜"(UTC 앵커+클램프 정규화)만 받는다 — 정답 선정·Secret 재유도는
// provider 내부 책임. 로컬: 내부 dailyAnswer(gameDate)로 Secret 재유도. 서버: 내부 fetch.
// → 세션 reducer·부트스트랩은 정답·날짜선정을 전혀 모른다(승급 = 어댑터 1개 교체).
export type CreateProvider = (gameDate: GameDate) => AnswerProvider;
```

provider는 `Secret`(candidate + 선택된 ability)을 **내부에서 `dailyAnswer(gameDate)`로 재유도해 클로저에 가두며**, 메서드 반환 어디에도 `Secret`·candidate 객체·정답 식별자가 새지 않는다. v1 로컬 구현 `createProvider(gameDate)`는 정적 결정론이다(런타임 fetch 0). **정답 선정·`Secret` 재유도가 provider 경계 안에 있으므로 세션 reducer·UI는 정답을 모르고, 미래 서버 승급은 같은 `CreateProvider` 시그니처의 어댑터 1개 교체로 끝난다**(정답 선정이 경계 밖에 남으면 서버판에서도 클라가 정답을 알아 승급이 성립 안 함 — 이를 구조로 차단). 이 경계는 엔진 ADR의 "엔진=완전한 단서 생성 / 정답 *식별*의 은닉=전송 계층 책임" 분리를 그대로 잇는 전송 계층 자리다.

> ⚠️ 이 비노출은 **인터페이스/직렬화 경계 한정**이다. v1 정적 번들·런타임 메모리에 정답 평문이 존재하는 것(탈취 가능)은 **비목표(탈취 감수)**다.

**(2) 데일리 선정 PRNG = 시드 순열/셔플(전단사, 선택지 b) + ability는 동일 시드 2차 파생.** 게임 날짜를 시드로 후보 풀에서 **충돌 없는 순열**로 정답 candidate를 고른다.

- **날짜 경계·시드·`GameDate` 타입**: 게임 날짜 = **UTC 자정 앵커**. 타임존 클램프 = `min(local, utc)`의 더 이른 게임 날짜(쌍근식, 기기 시계 앞당김으로 미래 정답 선취 방지). **`GameDate = string`**(클램프·정규화된 `'YYYY-MM-DD'` UTC) — provider 팩토리·`SessionView`·`PersistedSession`·영속 키 규약의 **단일 식별자**다. epoch day index·시드는 이 `GameDate`에서 파생하며 **별도 저장하지 않는다**(직렬화에 시드/순열 상태 부재의 근거).
- **candidate 선정(전단사)**: 후보 수 `N = candidates.length`(데이터 권위, v1 현재 1209). 한 "사이클"(연속 N일) 동안 각 후보가 **충돌 없이 한 번씩** 나오도록 시드 기반 결정론 셔플의 한 항을 고른다(예: 사이클 인덱스로 시드된 Fisher–Yates 순열의 `dayIndex % N`번째). seedable PRNG는 정적 정석(xmur3 + mulberry32)을 쓴다.
- **ability 파생(같은 시드)**: 선택된 candidate의 `abilities` 길이로 `2차 해시(seed) mod abilities.length` 인덱싱해 ability를 고른다. candidate와 ability가 **같은 게임 날짜로 함께 결정**되어 `Secret`이 완성된다(엔진이 candidate + ability를 요구).
- **세션에 정답 미저장·날짜 재유도**: 정답을 세션/localStorage에 저장하지 않는다. 대신 **`dailyAnswer(gameDate)`를 재계산**해 `Secret`을 재유도하고 그것으로 provider를 다시 구성한다. 영속에는 게임 날짜·누적 단서·move 수·상태만 담기므로 직렬화에 정답 식별자가 구조적으로 부재한다(=수용기준의 비노출 불변식과 정합). 복원은 "같은 날짜 → 같은 `Secret` 재유도"로 결정론이다.

**(3) 모듈/상태 구조 = `src/session/` headless 도메인.** 의존 방향은 `src/data·src/engine` → `src/session`(단방향). 구성:

- `dailyAnswer(gameDate)` — 위 (2)의 결정론 선정(순수). 게임 날짜 정규화(UTC 앵커 + `min(local,utc)` 클램프)도 이 안의 순수 함수.
- **세션 reducer(순수, `moveCount`의 단일 소유자)** — 현재 상태 + 이벤트(행동 결과/추측 결과) → 다음 상태. **`moveCount`는 reducer만 증가**시킨다(행동·추측 모두 +1; provider 응답은 단서/정오답만 담고 카운트를 모름 = 이중 진실원 제거). 점수 = `해결` 전이 시점의 `moveCount` 스냅샷. **등장 단서는 `진행` 최초 1회만 흡수**하는 멱등을 reducer 불변식으로 보장한다(복원 경로는 `entryClues()`를 재호출하지 않고, `clueLog`에 등장류가 이미 있으면 무시 → 중복 누적 0). 복원 시 저장된 `clueLog`는 **권위**(load한 그대로 사용, `submitAction` 재생 없음)라 일반 행동 단서의 중복도 구조적으로 0이다.
- **provider 인터페이스 + 팩토리**((1)) — 정답을 쥔 전송 경계.
- **영속 어댑터** — 영속을 인터페이스(`PersistenceAdapter`) 뒤에 둔다(v1 기본 구현 = localStorage, 키 규약 = `GameDate`별 1세션). 도메인 코어는 어댑터를 주입받아 localStorage·메모리 mock·서버 KV를 교체해도 불변. `PersistedSession.version`은 v1=1이며, load 시 version 불일치/미래값이면 폐기하고 새 세션을 시작한다(데일리 결정론이 정답을 재유도하므로 무손실).

UI(`battle-turn-ui`)가 소비할 **read 표면**과 **영속 직렬화 스키마**(둘 다 정답 식별자·시드/순열 상태 부재):

```ts
export type GameStatus = '진행' | '해결';

// UI가 화면에 그릴 read 표면. 정답 식별자는 status==='해결' 후 revealed로만 노출.
export interface SessionView {
  gameDate: GameDate;
  clueLog: readonly Clue[];   // 누적 단서(턴 순서)
  moveCount: number;          // 행동+추측 통합
  status: GameStatus;
  score?: number;             // 해결 시 = 해결 시점 moveCount
  revealed?: GuessResult['revealed'];  // 해결 후에만
}

// 영속 페이로드 — 게임 날짜로 정답을 재유도하므로 정답·시드 상태를 담지 않는다.
export interface PersistedSession {
  version: number;
  gameDate: GameDate;
  clueLog: readonly Clue[];
  moveCount: number;
  status: GameStatus;
}
export interface PersistenceAdapter {
  load(gameDate: GameDate): PersistedSession | null;
  save(session: PersistedSession): void;
}
```

**move/score 모델(형님 결정)**: 행동 제출과 이름 추측 제출 **모두 move를 1 증가**(동일 화폐). 추측은 **무제한**, `실패` 상태 없음. 추측 id가 정답 candidate와 일치하면 `해결` + 정답 공개, 아니면 `오답`(게임 계속, move만 +1). 게임은 **정답 시에만 종료**하고 그때의 move 수를 점수로 기록한다(포케맨틀식). 추측 입력은 **candidate id**(정규화 식별자)로 받으며, 이름→id 매핑·자동완성·폼 표기는 `battle-turn-ui` 소관(이 계층은 id 비교만). **하루 1판 고정(Squirdle식, 형님 결정)**: `GameDate`당 1세션이고 재도전·연습 모드는 없다(`status`는 `진행`/`해결` 2개; 종료 후 다음 `GameDate`까지 새 게임 없음). 정답 분포는 **전체 후보 균등**(전단사, 형님 결정)이며 인지도/난이도 가중·블랙리스트는 비목표다.

## 선택지

### 선택지 A: provider 경계 — C(정적 + Clue-only provider) vs B(순수 인라인 Squirdle)

정답을 쥐고 엔진을 호출하는 코드를 **격리된 provider 인터페이스 뒤에 둘지**, 아니면 **세션 reducer에 직접 인라인**할지의 결정. 우리 맥락은 솔로·정적·탈취 감수이되 미래 서버 승급을 막지 않는 것이다.

- **선택지 C — 정적 + Clue-only provider 경계(로컬 구현, 채택)**
  - 장점: 엔진 ADR의 "은닉=전송 계층 책임" 분리를 그대로 잇는다. 정답 식별자 비노출이 **인터페이스 타입 수준에서 강제**(`ActionResult`에 식별자 슬롯 자체가 없음)되어 수용기준의 비노출 불변식이 구조적으로 보장된다. 미래 은닉이 필요해지면 **같은 인터페이스의 Edge Function 어댑터 1개 교체**로 승급(레퍼런스 조사 권장 경로) — 세션 reducer·UI는 무수정. 로컬 구현 비용이 거의 0(provider는 엔진 호출을 감싸는 얇은 클로저).
  - 단점: 추상화 1겹(인터페이스 + 로컬 구현)이 순수 인라인보다 코드가 약간 늘고, v1에선 그 경계가 실 은닉을 제공하지 않는다(번들·메모리 평문은 여전히 탈취 가능). 즉 "당장의 보안 이득 0, 미래 옵션값만"이다.
- **선택지 B — 순수 인라인(pure Squirdle, 경계 없음)**
  - 장점: 가장 단순. 세션 reducer가 `Secret`을 직접 들고 `judge`를 호출하면 끝, 별도 인터페이스·구현체가 없다. 솔로 v1 코드량 최소.
  - 단점: 정답 식별자 비노출이 **규율로만** 지켜진다(reducer가 정답 객체를 직접 보유 → 직렬화·반환에 새지 않게 매번 수작업 주의 필요, 회귀 취약). 미래 서버 승급 시 정답 소유·엔진 호출 지점이 reducer 전반에 퍼져 있어 **재작업이 넓다**(전송 경계를 사후에 그어야 함). 엔진 ADR이 분리해둔 책임 경계를 세션 계층에서 다시 뭉갠다.

### 선택지 B: 데일리 PRNG — (a) seed-mod-N 인덱싱 vs (b) 시드 순열/셔플(전단사)

게임 날짜 시드로 candidate를 고르는 방식. 둘 다 candidate 결정 후 ability는 같은 시드의 2차 해시로 파생한다(공통).

- **선택지 a — `seed mod N` 직접 인덱싱**
  - 장점: 가장 단순(`candidates[hash(seed) % N]`), 구현·검증 즉시. 무상태.
  - 단점: 한 주기(N일) 안에서 **중복 허용** — 같은 후보가 며칠 만에 다시 나올 수 있고, 어떤 후보는 한 주기에 한 번도 안 나올 수 있다. "어제 봤는데 또?" UX 저하. 수용기준의 "연속 N일 → 각 후보 한 번씩"(전단사) 검증을 **만족하지 못해**, 분포 검증을 "쏠림이 균등 기대치를 벗어나지 않음"(약한 통계 검증)으로 낮춰야 한다.
- **선택지 b — 시드 순열/셔플(전단사, 채택)**
  - 장점: 한 사이클(연속 N일) 동안 각 후보가 **충돌 없이 정확히 한 번씩** 나온다(전단사) → "최근 본 정답이 또 나오는" 일이 사이클 내 0, UX↑. 수용기준의 강한 버전(전단사 무중복)을 **그대로 검증** 가능. 전 세계 동일 퍼즐(시드만 같으면 결정론).
  - 단점: 순열을 시드로 재현(예: 시드된 Fisher–Yates)하는 로직이 `mod N`보다 약간 복잡하고, 사이클 경계(N일마다 새 순열)·사이클 간 재셔플 시드 설계를 신중히 해야 한다. N(=1209)이 데이터로 변동하므로 순열 생성이 `N`에 동적으로 의존해야 한다(상수 금지).

(provider 축의 풀서버/Edge(A)는 PRD가 v1 비목표로 못박았고 — 레퍼런스 조사 매트릭스의 솔로 적합성·비용 근거 — 본 ADR은 그 결정을 전제로 C vs B만 다룬다.)

## 선택 근거

왜 이 선택지를 채택했는가?

- **provider 경계는 C 채택.** 비용이 거의 0(엔진 호출을 감싸는 얇은 클로저)인데, 정답 식별자 비노출을 **타입 수준에서 구조적으로** 강제해 수용기준의 비노출 불변식이 "규율"이 아니라 "컴파일러"로 지켜진다. 결정적으로 엔진 ADR이 이미 "엔진=완전한 단서 / 은닉=전송 계층 책임"으로 분리해 둔 자리에 정확히 맞물려, 미래 서버 승급이 **인터페이스 동일·어댑터 1개 교체**로 국소화된다(레퍼런스 조사가 권한 Cloudflare Pages Function 승급 경로). B(인라인)는 v1 코드량은 적지만 비노출을 수작업 규율에 맡겨 회귀에 취약하고, 미래 승급 시 정답 소유 지점이 reducer 전반에 퍼져 재작업이 넓어진다 — "되돌리기 어려운 아키텍처 결정"을 나쁜 쪽으로 굳힌다. 거의 공짜인 옵션값을 사는 게 합리적이라 C를 채택하고 B를 기각한다.
- **데일리 PRNG는 b(순열/셔플) 채택.** 핵심 차이는 사이클 내 중복이다. a(`mod N`)는 단순하지만 "어제 본 정답이 또"가 발생해 데일리 게임 UX를 직접 해치고, 강한 분포 수용기준(전단사)을 못 맞춰 검증을 약화시킨다. b는 한 사이클 동안 각 후보를 정확히 한 번씩 내 UX와 검증성을 동시에 올린다. 구현 복잡도 증가는 시드된 Fisher–Yates 한 함수로 흡수되고 결정론도 유지된다. 단순성 한 줌과 UX·검증성을 바꾸는 거래가 데일리 게임에 유리해 b를 채택하고 a를 기각한다.
- **ability는 같은 시드 2차 파생.** candidate와 분리된 별도 시드를 두면 동기화 부담만 늘 뿐 이득이 없다. 같은 게임 날짜에서 2차 해시로 파생하면 `(candidate, ability)`가 한 날짜에 함께 결정론적으로 묶여 엔진 `Secret`을 완성하고, "날짜 재유도"가 candidate·ability를 한 번에 되살린다.
- **정답 미저장·날짜 재유도 채택.** 세션에 정답을 저장하면 비노출 불변식을 직렬화마다 깨질 위험으로 떠안는다. `dailyAnswer(gameDate)` 재계산은 정답을 **영속에서 완전히 들어내** 비노출을 구조로 만들고, 복원을 "같은 날짜 → 같은 Secret"으로 단순화한다.
- **모듈은 `src/session/` 단방향.** headless 도메인을 한 곳에 모아 `src/data·src/engine`만 소비하고 UI 프레임워크 의존을 배제하면, 도메인 코어가 순수 reducer로 남아 Vitest 완결 검증이 가능하고 영속은 어댑터로 교체된다.

## 결과

이 결정으로 인해 예상되는 영향은 무엇인가?

### 긍정적 영향

- **미래 서버 승급의 어댑터화**: 은닉이 실제로 필요해지면 `AnswerProvider`를 Edge Function(KV 정답 조회 + 서버 judge) 어댑터로 교체하는 것만으로 "정답이 맞히기 전까지 서버를 안 떠난다"로 승급한다(레퍼런스 조사 권장). 세션 reducer·UI·검증은 무수정.
- **검증성**: 도메인 코어가 순수 reducer + 순수 `dailyAnswer`라 데일리 결정론·타임존 클램프·세션 누적·등장 단서 멱등·추측 판정·move 점수·비노출 불변식을 Vitest로 결정론적으로 덮는다. 영속은 메모리 mock 어댑터로 갈음해 테스트에서 localStorage 의존을 제거한다.
- **소비자 계약 안정**: `AnswerProvider`/`ActionResult`/`GuessResult`/세션 모델이 `battle-turn-ui`가 의존할 안정 표면이 된다. 정답 식별자 비노출이 타입 슬롯 부재로 강제돼 UI가 실수로 정답을 그릴 수 없다.
- **UX**: 전단사 순열로 사이클 내 정답 무중복 + UTC 앵커로 전 세계 동일 퍼즐 + 무제한 추측·move 점수로 진입장벽 없는 포케맨틀식 플레이.

### 부정적 영향 / 트레이드오프

- **정적 탈취 감수의 한계**: 비노출은 인터페이스/직렬화 경계 한정이다. v1 번들·메모리에는 데이터(1209 후보)와 그날 `Secret`을 재유도하는 결정론 로직이 평문으로 존재하므로 작정하면 탈취 가능하다(형님 결정·Squirdle 선례로 수용). 비노출 불변식 테스트가 "번들 평문 부재"를 보장하지 않음을 명시해 오해를 차단해야 한다. 또한 누적 `Clue` 로그가 후보를 좁히는 것은 게임 메커니즘상 **의도된 정보 공개**이지 비노출 위반이 아니다(보호 대상은 '정답 식별자 문자열'뿐). 영속 직렬화엔 정답 식별자뿐 아니라 **시드/순열 상태도 없어**(게임 날짜만으로 재유도) 직렬화로부터의 정답 역산 경로가 닫힌다.
- **provider 추상화 비용**: v1에선 실 은닉 이득이 0인데 인터페이스 1겹·로컬 구현체가 추가된다(미래 옵션값을 위한 선투자). 추상화가 과하면 인라인 대비 읽기 비용이 늘 수 있어, provider는 "엔진 호출 캡슐화 + 식별자 비노출"이라는 최소 책임으로만 얇게 유지한다.
- **순열 사이클 경계 복잡도**: 전단사를 위해 N일 사이클 경계·사이클 간 재셔플 시드를 정확히 다뤄야 하고, N이 데이터로 변동(폼 추가 등)하면 진행 중 사이클의 후보 인덱싱 정합을 신경 써야 한다(상수 하드코딩 금지, `N = candidates.length`).
- **날짜 재유도의 재계산 비용**: 복원·매 행동마다 `dailyAnswer(gameDate)`로 `Secret`을 재유도하지만, 1209 풀의 순열 1항 + 해시 1회라 비용은 무시 가능하다(필요 시 게임 날짜 단위 메모이즈).

## 후속 작업

- [ ] `src/session/` 도메인 구현: `dailyAnswer(gameDate)`(UTC 앵커 + `min(local,utc)` 클램프 + 시드된 Fisher–Yates 전단사 순열 candidate 선정 + 2차 해시 ability 파생), 순수 세션 reducer(`moveCount` 단일 소유·누적 단서·상태·등장단서 멱등), `CreateProvider` 로컬 구현(`createProvider(gameDate)` — 내부에서 `dailyAnswer` 재유도), `PersistenceAdapter` localStorage 구현(인터페이스 뒤), `SessionView` 셀렉터.
- [ ] **Vitest**: 데일리 결정론(같은 날짜 → 같은 `(candidate, ability)`), 전단사 분포(연속 N일 무중복), **사이클 경계 결정론**(N일·N+1일째 사이클 간 재셔플 시드 재현성), 타임존 클램프 경계, 행동→단서 누적, 등장 단서 멱등(복원 후 미재방출), 추측 판정(정답/오답), move 카운트·점수, 정답 비노출 불변식(provider 반환·직렬화 문자열·시드상태 grep), 영속 복원(메모리 mock), 순수성.
- [ ] **`battle-turn-ui` 연동 지점**: UI 소비 표면 = `AnswerProvider`(`entryClues()`/`submitAction`/`submitGuess(candidateId)`) + **`SessionView`**(누적 단서·move 수·상태·점수·해결 시 `revealed`). 이름→candidate id 매핑·자동완성·폼 표기·연출은 UI 소관(경계).
- [ ] **미래 은닉 승급 시드 문서화**: `AnswerProvider`를 Cloudflare Pages Function + Workers KV 어댑터로 교체하는 절차(KV 정답 사전 시드 `answer:YYYY-MM-DD` UTC, 서버 judge 실행, 응답은 Clue-only 유지)를 후속 ADR/노트로 남긴다.

## 검증

- [ ] **데일리 결정론**: 같은 게임 날짜 입력 → 같은 `(candidate, ability)`(특성까지 동일). (PRD 수용기준 「데일리 결정론」)
- [ ] **데일리 분포(전단사)**: 후보 수 `N = candidates.length`만큼의 연속 게임 날짜를 돌리면 각 후보가 **충돌 없이 한 번씩** 선택된다(순열/셔플 채택에 맞춘 강한 검증). (수용기준 「데일리 분포」)
- [ ] **타임존 클램프**: 기기 시계를 다음날로 당겨도 게임 날짜가 `min(local, utc)`로 묶여 다음 정답을 선취하지 못한다. 정상 진행 시 UTC 자정 앵커로 다음 퍼즐 경계가 결정된다(경계 케이스). ⚠️ 클램프는 **정상 앱 경로의 날짜 진행만** 묶으며, 번들 노출된 `dailyAnswer` 직접 호출로 임의 날짜 정답을 산출하는 것은 탈취 감수 비목표(클램프 무관). (수용기준 「타임존 클램프」)
- [ ] **행동→단서 누적**: 행동 제출 시 엔진 `Clue`가 세션 로그에 순서대로 쌓인다. (수용기준 「행동→단서 누적」)
- [ ] **등장 단서 멱등**: 새로고침/복원 후에도 등장 단서가 재방출·중복 누적되지 않는다(시작 1회). (수용기준 「등장 단서 멱등」)
- [ ] **추측 판정**: 정답 candidate id 제출 → `해결` + 정답 공개(`revealed` 채워짐) + move 수를 점수로 기록. 오답 → `오답`(게임 계속, move만 +1). (수용기준 「추측 판정」)
- [ ] **이동 카운트·점수**: 행동·추측 모두 move를 1 증가시킨다. 오답 추측은 게임을 끝내지 않고 move만 증가, 정답 시 `해결` + 그 move 수가 점수로 기록된다. `실패` 상태는 없다. (수용기준 「이동 카운트·점수」)
- [ ] **정답 비노출 불변식(인터페이스 경계)**: 게임이 `진행`인 동안 provider 반환 객체와 세션 직렬화 문자열을 검사(grep)하면 정답의 `candidateId`·`nameKo`(정답 candidate 한국어명)·`abilityId`(ability.id) 문자열과 **Secret 재유도용 시드/순열 상태**가 모두 **부재**한다(해결 후에만 `revealed`로 공개). ⚠️ 인터페이스/직렬화 경계 검증이며 번들·메모리 평문 부재는 보장하지 않는다. 누적 `Clue` 로그를 통한 후보 특정은 게임 메커니즘상 의도된 정보로 보호 대상이 아니다. (수용기준 「정답 비노출 불변식」)
- [ ] **영속 복원**: 새로고침 후 같은 게임 날짜의 세션(누적 단서·move 수·상태)이 복원되고, 정답은 저장 없이 `dailyAnswer(gameDate)` 재유도로 복구된다. 저장 `clueLog`가 권위(재생 없음)라 일반 행동 단서 중복도 0(메모리 mock 어댑터로 검증). (수용기준 「영속 복원」)
- [ ] **순수성**: 동일 입력 반복이 동일 결과를 내고 도메인 코어가 외부/전역 상태를 바꾸지 않는다(localStorage 접근은 어댑터로 격리). (수용기준 「순수성」)
- [ ] **의존 방향·외부 의존 0**: `src/session`이 `src/data·src/engine`만 참조하고 런타임 fetch 0.
- [ ] `npm run harness:gate` 통과.
