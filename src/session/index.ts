// 추측/피드백 계약 — 공개 표면 (headless 도메인 re-export + 게임 부트스트랩 헬퍼)
//
// 권위 출처:
//  - ADR `docs/raw/feature/guess-feedback-contract/adr.md` 결정(1)(2)(3): 전 공개 타입·알고리즘·reducer.
//
// 소비: `battle-turn-ui`가 AnswerProvider + SessionView로 한 판을 구동한다.
// 의존 방향: src/data·src/engine → src/session 단방향. 런타임 외부 fetch 0.

import { dailyAnswer, normalizeGameDate } from "./dailyAnswer";
import { createLocalStoragePersistence } from "./persistence";
import { createProvider } from "./provider";
import {
  applyAction,
  applyGuess,
  fromPersisted,
  ingestEntryClues,
  initSession,
  toPersisted,
} from "./session";
import type { SessionState } from "./session";
import type {
  AnswerProvider,
  CreateProvider,
  GameDate,
  GuessResult,
  PersistenceAdapter,
} from "./types";

// ── 공개 타입 ──
export type {
  ActionResult,
  AnswerProvider,
  CreateProvider,
  GameDate,
  GameStatus,
  GuessResult,
  PersistedSession,
  PersistenceAdapter,
  SessionView,
} from "./types";

// ── 데일리 선정 ──
export { dailyAnswer, normalizeGameDate } from "./dailyAnswer";

// ── 순수 reducer + 셀렉터 ──
export {
  PERSISTED_VERSION,
  applyAction,
  applyGuess,
  fromPersisted,
  ingestEntryClues,
  initSession,
  toPersisted,
  toSessionView,
} from "./session";
export type { SessionState } from "./session";

// ── provider 로컬 구현 ──
export { createProvider } from "./provider";

// ── 영속 어댑터 ──
export { createLocalStoragePersistence, createMemoryPersistence } from "./persistence";

/**
 * 한 판의 게임 핸들 — 부트스트랩이 묶어 돌려주는 구동 단위.
 * provider(정답 캡슐화) + 현재 도메인 상태를 함께 들고, 영속/엔진 호출은 헬퍼가 조율한다.
 */
export interface GameSession {
  /** 정답을 쥔 전송 경계(엔진 호출 캡슐화). */
  readonly provider: AnswerProvider;
  /** 현재 순수 도메인 상태(불변 스냅샷). */
  readonly state: SessionState;
}

/**
 * 부트스트랩 옵션. createProvider·persistence를 주입받아 정답 선정·I/O를 경계로 격리한다.
 * 기본값: v1 로컬 provider + localStorage 영속.
 */
export interface BootstrapOptions {
  createProvider?: CreateProvider;
  persistence?: PersistenceAdapter;
}

/** 복원 시 해결 상태였다면 revealed를 정답 재유도로 채운다(reducer는 정답을 모름). */
function reviveRevealed(gameDate: GameDate, state: SessionState): SessionState {
  if (state.status !== "해결" || state.revealed !== undefined) return state;
  const secret = dailyAnswer(gameDate);
  const revealed: GuessResult["revealed"] = {
    candidateId: secret.candidate.id,
    nameKo: secret.candidate.nameKo,
    abilityId: secret.ability.id,
  };
  return { ...state, revealed };
}

/**
 * 게임 부트스트랩(하루 1판). 저장 세션이 있으면 clueLog 권위로 복원(재생·등장단서 재방출 없음),
 * 없으면 새 세션 + 등장 단서 1회 흡수. provider는 gameDate로 재구성(정답 재유도는 provider 내부).
 *
 * @param gameDate 게임 날짜. 미지정 시 normalizeGameDate()(UTC 앵커 + min(local,utc) 클램프).
 */
export function bootstrapGame(gameDate?: GameDate, options: BootstrapOptions = {}): GameSession {
  const resolvedDate = gameDate ?? normalizeGameDate();
  const make = options.createProvider ?? createProvider;
  const persistence = options.persistence ?? createLocalStoragePersistence();

  const provider = make(resolvedDate);
  const persisted = persistence.load(resolvedDate);

  if (persisted !== null) {
    // 복원: 저장 clueLog가 권위(submitAction 재생 없음, 등장 단서 재흡수 없음).
    const state = reviveRevealed(resolvedDate, fromPersisted(persisted));
    return { provider, state };
  }

  // 새 게임: 등장 단서 1회 흡수(멱등). 초기 상태를 영속해 다음 복원의 권위를 만든다.
  const state = ingestEntryClues(initSession(resolvedDate), provider.entryClues());
  persistence.save(toPersisted(state));
  return { provider, state };
}

/**
 * 행동 제출 + 영속 1스텝. provider로 단서를 받아 reducer로 누적하고 저장한다.
 * 다음 GameSession을 반환(불변 갱신). 해결 상태면 변화 없음.
 */
export function submitActionStep(
  session: GameSession,
  action: Parameters<AnswerProvider["submitAction"]>[0],
  persistence: PersistenceAdapter,
): GameSession {
  const result = session.provider.submitAction(action);
  const state = applyAction(session.state, result);
  persistence.save(toPersisted(state));
  return { provider: session.provider, state };
}

/**
 * 추측 제출 + 영속 1스텝. provider로 정오답을 받아 reducer로 move·해결 전이·revealed를 반영.
 * 다음 GameSession을 반환(불변 갱신). 해결 상태면 변화 없음.
 */
export function submitGuessStep(
  session: GameSession,
  candidateId: string,
  persistence: PersistenceAdapter,
): GameSession {
  const result = session.provider.submitGuess(candidateId);
  const state = applyGuess(session.state, result);
  persistence.save(toPersisted(state));
  return { provider: session.provider, state };
}
