// 추측/피드백 계약 — 공개 타입 (ADR 결정 섹션 타입 계약을 그대로 구현)
//
// 권위 출처:
//  - ADR `docs/raw/feature/guess-feedback-contract/adr.md` 결정(1)(3): 공개 타입 계약 (시그니처 변경 불가).
//  - 소비: `battle-turn-ui`가 의존할 안정 표면(AnswerProvider / SessionView).
//
// 의존 방향: src/data·src/engine → src/session 단방향. engine에서 type-only import만 한다.

import type { Action, Clue } from "../engine";

/**
 * 게임 날짜 = 클램프·정규화된 'YYYY-MM-DD'(UTC) 문자열.
 * provider 팩토리·SessionView·PersistedSession·영속 키 규약의 단일 식별자.
 * epoch day index·시드는 이 GameDate에서 파생하며 별도 저장하지 않는다.
 */
export type GameDate = string;

/** 게임 상태 — `진행`/`해결` 2개(`실패` 없음, 정답 시에만 종료). */
export type GameStatus = "진행" | "해결";

/**
 * 정답이 아직 안 풀린 동안에는 식별자가 절대 빠져나오지 않는 행동 결과 타입.
 * 엔진이 낸 단서(Clue)만 담는다.
 */
export interface ActionResult {
  clues: readonly Clue[];
}

/**
 * 추측 결과. correct === true 일 때만 revealed가 채워진다(해결 전에는 undefined).
 * nameKo = 정답 candidate의 한국어명, abilityId = ability.id (data Ability엔 nameKo 없음).
 */
export interface GuessResult {
  correct: boolean;
  revealed?: {
    candidateId: string;
    nameKo: string;
    abilityId: string;
  };
}

/**
 * 정답 Secret을 내재해 엔진 호출을 캡슐화하는 전송 경계.
 * 메서드 반환 어디에도 Secret·candidate 객체·정답 식별자가 새지 않는다(해결 전).
 */
export interface AnswerProvider {
  /** 등장 단서(게임 시작 1회). */
  entryClues(): readonly Clue[];
  /** 유저 행동 제출 → 엔진 judge 위임 → 단서만 반환. */
  submitAction(action: Readonly<Action>): ActionResult;
  /** candidate id 비교만 — 정답 식별자는 correct일 때만 revealed로 공개. */
  submitGuess(candidateId: string): GuessResult;
}

/**
 * provider 팩토리. "게임 날짜"(UTC 앵커+클램프 정규화)만 받는다 — 정답 선정·Secret 재유도는
 * provider 내부 책임. 로컬: 내부 dailyAnswer(gameDate)로 Secret 재유도. 서버: 내부 fetch.
 * → 세션 reducer·부트스트랩은 정답·날짜선정을 전혀 모른다(승급 = 어댑터 1개 교체).
 */
export type CreateProvider = (gameDate: GameDate) => AnswerProvider;

/**
 * UI가 화면에 그릴 read 표면. 정답 식별자는 status==='해결' 후 revealed로만 노출.
 */
export interface SessionView {
  gameDate: GameDate;
  /** 누적 단서(턴 순서). */
  clueLog: readonly Clue[];
  /** 행동+추측 통합 카운트. */
  moveCount: number;
  status: GameStatus;
  /** 해결 시 = 해결 시점 moveCount. */
  score?: number;
  /** 해결 후에만. */
  revealed?: GuessResult["revealed"];
}

/**
 * 영속 페이로드 — 게임 날짜로 정답을 재유도하므로 정답·시드 상태를 담지 않는다.
 */
export interface PersistedSession {
  version: number;
  gameDate: GameDate;
  clueLog: readonly Clue[];
  moveCount: number;
  status: GameStatus;
}

/** 영속 어댑터(인터페이스 뒤에 둔다 — localStorage·메모리 mock·서버 KV 교체 가능). */
export interface PersistenceAdapter {
  load(gameDate: GameDate): PersistedSession | null;
  save(session: PersistedSession): void;
}
