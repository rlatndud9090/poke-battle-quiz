// 추측/피드백 계약 — 순수 세션 reducer (ADR 결정(3): moveCount 단일 소유·등장단서 멱등)
//
// 권위 출처:
//  - ADR `docs/raw/feature/guess-feedback-contract/adr.md` 결정(3): reducer 모델·move/score·멱등.
//  - PRD 수용기준: 행동→단서 누적 / 등장 단서 멱등 / 추측 판정 / 이동 카운트·점수 / 순수성.
//
// 순수 함수만. 외부/전역 가변 상태를 만지지 않는다(localStorage는 persistence 어댑터로 격리).
// moveCount는 reducer만 증가시킨다(provider 응답은 단서/정오답만 담고 카운트를 모름).

import type { Clue } from "../engine";
import type {
  ActionResult,
  GameDate,
  GameStatus,
  GuessResult,
  PersistedSession,
  SessionView,
} from "./types";

/** 영속 스키마 버전(v1=1). PersistedSession.version과 일치해야 한다. */
export const PERSISTED_VERSION = 1;

/**
 * 세션 도메인 상태. 직렬화 표면(PersistedSession)은 gameDate·clueLog·moveCount·status뿐이며
 * score·revealed는 파생/공개 페이로드라 toSessionView·부트스트랩 책임으로 둔다.
 */
export interface SessionState {
  gameDate: GameDate;
  /** 누적 단서(턴 순서). */
  clueLog: readonly Clue[];
  /** 행동+추측 통합 카운트(reducer만 증가). */
  moveCount: number;
  status: GameStatus;
  /** 해결 시 = 해결 전이 시점의 moveCount 스냅샷. */
  score?: number;
  /** 해결 후에만 — 정답 공개 페이로드(직렬화엔 미포함). */
  revealed?: GuessResult["revealed"];
}

/** 새 게임 초기 상태(빈 단서, move 0, 진행). 등장 단서 흡수는 ingestEntryClues로. */
export function initSession(gameDate: GameDate): SessionState {
  return {
    gameDate,
    clueLog: [],
    moveCount: 0,
    status: "진행",
  };
}

/**
 * 등장 단서 흡수(멱등). `진행` 최초 1회 — clueLog가 비어 있을 때만 흡수한다.
 *
 * 등장은 항상 게임 시작 시점(어떤 행동보다 먼저)에 일어나므로, clueLog가 비어 있다는 것은
 * "아직 등장도 행동도 없는 새 게임"을 뜻한다. 따라서 빈 로그 가드가 곧 등장 1회 멱등이다.
 * 복원 경로는 ingestEntryClues를 거치지 않고 저장 clueLog를 권위로 쓰므로(중복 누적 0),
 * 이 함수는 같은 새 세션에 실수로 두 번 호출돼도 안전하다.
 *
 * 빈 로그 가드를 쓰는 이유: 등장 단서 kind(entry/rank/marker)는 일반 행동 단서로도 나올 수
 * 있어 "kind 존재"로 흡수 여부를 판정하면 오탐한다. "빈 로그"는 등장 시점을 정확히 가리킨다.
 */
export function ingestEntryClues(state: SessionState, entry: readonly Clue[]): SessionState {
  if (state.status !== "진행") return state;
  if (entry.length === 0) return state;
  if (state.clueLog.length > 0) return state;
  return { ...state, clueLog: [...entry] };
}

/**
 * 행동 결과 적용: 단서를 순서대로 누적하고 move를 1 증가.
 * 해결 상태면 변화 없음(게임 종료 후 행동 무시).
 */
export function applyAction(state: SessionState, result: ActionResult): SessionState {
  if (state.status !== "진행") return state;
  return {
    ...state,
    clueLog: [...state.clueLog, ...result.clues],
    moveCount: state.moveCount + 1,
  };
}

/**
 * 추측 결과 적용: move를 1 증가. correct면 `해결` 전이 + score=해결 시점 moveCount + revealed.
 * 오답이면 move만 +1(게임 계속). 해결 상태면 변화 없음.
 */
export function applyGuess(state: SessionState, result: GuessResult): SessionState {
  if (state.status !== "진행") return state;
  const moveCount = state.moveCount + 1;
  if (!result.correct) {
    return { ...state, moveCount };
  }
  return {
    ...state,
    moveCount,
    status: "해결",
    score: moveCount,
    revealed: result.revealed,
  };
}

/**
 * 직렬화 표면(PersistedSession)으로 투영 — 정답 식별자·score·revealed를 담지 않는다.
 * score는 status==='해결'이면 moveCount와 동일하므로 복원 시 재유도 가능(중복 저장 회피).
 */
export function toPersisted(state: SessionState): PersistedSession {
  return {
    version: PERSISTED_VERSION,
    gameDate: state.gameDate,
    clueLog: state.clueLog,
    moveCount: state.moveCount,
    status: state.status,
  };
}

/**
 * 직렬화 표면 → 도메인 상태 복원. 저장 clueLog는 권위(재생 없음).
 * 해결 상태면 score를 moveCount로 재유도한다(직렬화에 score 부재). revealed는 정답을 아는
 * 부트스트랩(provider 재유도)에서 채운다 — reducer/복원은 정답을 모른다.
 */
export function fromPersisted(persisted: PersistedSession): SessionState {
  const state: SessionState = {
    gameDate: persisted.gameDate,
    clueLog: persisted.clueLog,
    moveCount: persisted.moveCount,
    status: persisted.status,
  };
  if (persisted.status === "해결") {
    state.score = persisted.moveCount;
  }
  return state;
}

/** UI read 표면 셀렉터. 상태에서 SessionView를 파생(정답 식별자는 revealed로만). */
export function toSessionView(state: SessionState): SessionView {
  return {
    gameDate: state.gameDate,
    clueLog: state.clueLog,
    moveCount: state.moveCount,
    status: state.status,
    score: state.score,
    revealed: state.revealed,
  };
}
