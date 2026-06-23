// 순수 세션 reducer 검증 (ADR 검증: 행동→단서 누적 / 등장 단서 멱등 / 추측 판정 / move·점수 / 순수성)
//
// 권위: docs/raw/feature/guess-feedback-contract/adr.md `## 검증` + prd.md `## 수용 기준`.
// 구현 표면: src/session/session.ts
//   (initSession / ingestEntryClues / applyAction / applyGuess / toPersisted / fromPersisted / toSessionView).

import { describe, expect, it } from "vitest";
import type { Clue } from "../engine";
import type { ActionResult, GuessResult } from "./types";
import {
  applyAction,
  applyGuess,
  fromPersisted,
  ingestEntryClues,
  initSession,
  toPersisted,
  toSessionView,
} from "./session";

// ── 테스트 픽스처 (엔진/데이터 무관한 순수 Clue 값으로 reducer만 검증) ──

const DAMAGE_CLUE: Clue = { kind: "damage", multiplier: 2 };
const STATUS_CLUE: Clue = { kind: "status", status: "burn", result: "applied" };
const MARKER_ENTRY: readonly Clue[] = [{ kind: "marker", marker: "intimidate" }];
const RANK_ENTRY: readonly Clue[] = [{ kind: "rank", target: "secret", stat: "atk", delta: 1 }];
const WEATHER_ENTRY: readonly Clue[] = [{ kind: "entry", effect: { kind: "weather", weather: "sun" } }];

const actionResult = (...clues: Clue[]): ActionResult => ({ clues });
const correctGuess = (): GuessResult => ({
  correct: true,
  revealed: { candidateId: "charizard", nameKo: "리자몽", abilityId: "blaze" },
});
const wrongGuess: GuessResult = { correct: false };

describe("applyAction — 행동→단서 누적", () => {
  it("엔진 Clue가 clueLog에 순서대로 쌓인다", () => {
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE));
    state = applyAction(state, actionResult(STATUS_CLUE, DAMAGE_CLUE));
    expect(state.clueLog).toEqual([DAMAGE_CLUE, STATUS_CLUE, DAMAGE_CLUE]);
  });

  it("행동 한 번당 moveCount +1", () => {
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE));
    state = applyAction(state, actionResult(STATUS_CLUE));
    expect(state.moveCount).toBe(2);
    expect(state.status).toBe("진행");
  });

  it("해결 상태면 행동은 무시된다(게임 종료 후)", () => {
    let state = initSession("2026-06-23");
    state = applyGuess(state, correctGuess());
    const before = state;
    const after = applyAction(state, actionResult(DAMAGE_CLUE));
    expect(after).toEqual(before);
  });
});

describe("ingestEntryClues — 등장 단서 멱등", () => {
  // ADR: 빈 로그 가드 = 등장 1회 멱등. kind(marker/rank/entry) 오탐 방지(구현자가 잡은 회귀).
  it.each([
    ["marker(intimidate)", MARKER_ENTRY],
    ["rank(자신 부스트)", RANK_ENTRY],
    ["entry(날씨)", WEATHER_ENTRY],
  ])("%s 정답: 시작 1회 흡수, 재흡수해도 중복 누적 0", (_label, entry) => {
    const fresh = initSession("2026-06-23");
    const ingested = ingestEntryClues(fresh, entry);
    expect(ingested.clueLog).toEqual([...entry]);

    // 같은 새 세션에 다시 흡수 시도 → 멱등(중복 0).
    const reingested = ingestEntryClues(ingested, entry);
    expect(reingested.clueLog).toEqual([...entry]);
    expect(reingested.clueLog.length).toBe(entry.length);
  });

  it("복원(저장 clueLog 권위)된 상태에 재흡수해도 중복 누적 0", () => {
    // 부트스트랩 복원 경로 모사: clueLog가 이미 있는 상태에 ingest 재호출.
    const restored = fromPersisted({
      version: 1,
      gameDate: "2026-06-23",
      clueLog: [...MARKER_ENTRY],
      moveCount: 0,
      status: "진행",
    });
    const reingested = ingestEntryClues(restored, MARKER_ENTRY);
    expect(reingested.clueLog).toEqual([...MARKER_ENTRY]);
  });

  it("행동 단서가 쌓인 뒤엔 등장 단서를 흡수하지 않는다(빈 로그 가드)", () => {
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE));
    const after = ingestEntryClues(state, MARKER_ENTRY);
    expect(after.clueLog).toEqual([DAMAGE_CLUE]); // 등장 미흡수
  });

  it("빈 등장 단서(entry 슬롯 없는 정답)는 흡수 자체가 no-op", () => {
    const fresh = initSession("2026-06-23");
    const after = ingestEntryClues(fresh, []);
    expect(after.clueLog).toEqual([]);
  });

  it("해결 상태면 등장 단서를 흡수하지 않는다", () => {
    let state = initSession("2026-06-23");
    state = applyGuess(state, correctGuess());
    const after = ingestEntryClues(state, MARKER_ENTRY);
    expect(after.clueLog).toEqual([]);
  });
});

describe("applyGuess — 추측 판정", () => {
  it("정답 candidate id → correct=true·status='해결'·revealed 채워짐", () => {
    let state = initSession("2026-06-23");
    const guess = correctGuess();
    state = applyGuess(state, guess);
    expect(state.status).toBe("해결");
    expect(state.revealed).toEqual(guess.revealed);
    expect(state.revealed?.nameKo).toBe("리자몽");
    expect(state.revealed?.abilityId).toBe("blaze");
    expect(state.revealed?.candidateId).toBe("charizard");
  });

  it("오답 → correct=false·status 유지(진행)·게임 계속", () => {
    let state = initSession("2026-06-23");
    state = applyGuess(state, wrongGuess);
    expect(state.status).toBe("진행");
    expect(state.revealed).toBeUndefined();
    expect(state.score).toBeUndefined();
  });
});

describe("move 카운트·점수", () => {
  it("행동·추측 모두 moveCount +1 (동일 화폐, 무제한·실패 없음)", () => {
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE)); // move 1
    state = applyGuess(state, wrongGuess); // move 2
    state = applyAction(state, actionResult(STATUS_CLUE)); // move 3
    expect(state.moveCount).toBe(3);
    expect(state.status).toBe("진행");
  });

  it("정답 시 score = 그 시점 moveCount", () => {
    let state = initSession("2026-06-23");
    state = applyGuess(state, correctGuess()); // 첫 추측에 정답
    expect(state.moveCount).toBe(1);
    expect(state.score).toBe(1);
  });

  it("오답 여러 번 후 정답이면 score = 총 move 수", () => {
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE)); // 1
    state = applyGuess(state, wrongGuess); // 2
    state = applyGuess(state, wrongGuess); // 3
    state = applyAction(state, actionResult(STATUS_CLUE)); // 4
    state = applyGuess(state, correctGuess()); // 5 → 정답
    expect(state.moveCount).toBe(5);
    expect(state.score).toBe(5);
    expect(state.status).toBe("해결");
  });

  it("해결 후 추가 추측은 무시(move·score 불변)", () => {
    let state = initSession("2026-06-23");
    state = applyGuess(state, correctGuess()); // move 1, score 1
    const after = applyGuess(state, wrongGuess);
    expect(after.moveCount).toBe(1);
    expect(after.score).toBe(1);
  });
});

describe("순수성 — reducer 동일 입력 반복 동일 결과 + 입력 불변", () => {
  it("applyAction은 동일 입력에 동일 결과(toEqual)", () => {
    const base = initSession("2026-06-23");
    const r1 = applyAction(base, actionResult(DAMAGE_CLUE));
    const r2 = applyAction(base, actionResult(DAMAGE_CLUE));
    expect(r1).toEqual(r2);
  });

  it("applyGuess는 동일 입력에 동일 결과(toEqual)", () => {
    const base = initSession("2026-06-23");
    const r1 = applyGuess(base, correctGuess());
    const r2 = applyGuess(base, correctGuess());
    expect(r1).toEqual(r2);
  });

  it("입력 state를 변형하지 않는다(외부 상태 미변경)", () => {
    const base = initSession("2026-06-23");
    const snapshot = structuredClone(base);
    applyAction(base, actionResult(DAMAGE_CLUE));
    applyGuess(base, correctGuess());
    ingestEntryClues(base, MARKER_ENTRY);
    expect(base).toEqual(snapshot); // 원본 불변
  });

  it("입력 clueLog 배열을 in-place로 건드리지 않는다", () => {
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE));
    const prevLog = state.clueLog;
    const prevLen = prevLog.length;
    applyAction(state, actionResult(STATUS_CLUE));
    expect(state.clueLog).toBe(prevLog); // 같은 참조 유지(불변 갱신은 새 배열로)
    expect(state.clueLog.length).toBe(prevLen);
  });
});

describe("toSessionView / toPersisted / fromPersisted — 직렬화·셀렉터", () => {
  it("toSessionView는 상태를 read 표면으로 투영", () => {
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE));
    state = applyGuess(state, correctGuess());
    const view = toSessionView(state);
    expect(view.gameDate).toBe("2026-06-23");
    expect(view.moveCount).toBe(2);
    expect(view.status).toBe("해결");
    expect(view.score).toBe(2);
    expect(view.revealed?.candidateId).toBe("charizard");
  });

  it("toPersisted는 score·revealed를 담지 않는다(직렬화 표면)", () => {
    let state = initSession("2026-06-23");
    state = applyGuess(state, correctGuess());
    const persisted = toPersisted(state);
    expect(persisted).not.toHaveProperty("score");
    expect(persisted).not.toHaveProperty("revealed");
    expect(persisted.version).toBe(1);
  });

  it("fromPersisted: 해결 상태면 score를 moveCount로 재유도(직렬화엔 score 부재)", () => {
    const restored = fromPersisted({
      version: 1,
      gameDate: "2026-06-23",
      clueLog: [DAMAGE_CLUE],
      moveCount: 4,
      status: "해결",
    });
    expect(restored.score).toBe(4);
    expect(restored.revealed).toBeUndefined(); // revealed는 부트스트랩이 정답 재유도로 채움
  });

  it("fromPersisted: 진행 상태면 score 미설정", () => {
    const restored = fromPersisted({
      version: 1,
      gameDate: "2026-06-23",
      clueLog: [],
      moveCount: 2,
      status: "진행",
    });
    expect(restored.score).toBeUndefined();
  });
});
