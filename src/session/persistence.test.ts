// 영속 어댑터 검증 (ADR 검증: 영속 복원 — 메모리 mock save→load 라운드트립 + version 폐기)
//
// 권위: docs/raw/feature/guess-feedback-contract/adr.md `## 검증` + prd.md `## 수용 기준`.
// 구현 표면: src/session/persistence.ts (createMemoryPersistence) + session reducer.

import { describe, expect, it } from "vitest";
import type { Clue } from "../engine";
import { createLocalStoragePersistence, createMemoryPersistence } from "./persistence";
import { applyAction, fromPersisted, initSession, toPersisted } from "./session";
import type { ActionResult, PersistedSession, PersistenceAdapter } from "./types";

const DAMAGE_CLUE: Clue = { kind: "damage", multiplier: 2 };
const STATUS_CLUE: Clue = { kind: "status", status: "burn", result: "applied" };
const actionResult = (...clues: Clue[]): ActionResult => ({ clues });

describe("createMemoryPersistence — save→load 라운드트립", () => {
  it("같은 GameDate 세션(clueLog·moveCount·status)이 복원된다", () => {
    const persistence = createMemoryPersistence();
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE));
    state = applyAction(state, actionResult(STATUS_CLUE));
    persistence.save(toPersisted(state));

    const loaded = persistence.load("2026-06-23");
    expect(loaded).not.toBeNull();
    const restored = fromPersisted(loaded as PersistedSession);
    expect(restored.gameDate).toBe("2026-06-23");
    expect(restored.clueLog).toEqual([DAMAGE_CLUE, STATUS_CLUE]);
    expect(restored.moveCount).toBe(2);
    expect(restored.status).toBe("진행");
  });

  it("저장하지 않은 다른 GameDate는 null", () => {
    const persistence = createMemoryPersistence();
    persistence.save(toPersisted(initSession("2026-06-23")));
    expect(persistence.load("2026-06-24")).toBeNull();
  });

  it("저장 clueLog가 권위(재생 없음) → 복원 후 일반 행동 단서 중복 누적 0", () => {
    const persistence = createMemoryPersistence();
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE, STATUS_CLUE));
    persistence.save(toPersisted(state));

    // 복원은 저장 clueLog를 그대로 사용(submitAction 재생 없음).
    const restored = fromPersisted(persistence.load("2026-06-23") as PersistedSession);
    expect(restored.clueLog).toEqual([DAMAGE_CLUE, STATUS_CLUE]);
    expect(restored.clueLog.length).toBe(2); // 중복 없음
  });

  it("해결 세션 라운드트립: status·moveCount 복원 + score 재유도", () => {
    const persistence = createMemoryPersistence();
    let state = initSession("2026-06-23");
    state = applyAction(state, actionResult(DAMAGE_CLUE));
    // 해결 상태를 직접 만들어 저장(applyGuess 없이 직렬화 표면만 검증).
    const solved = toPersisted({ ...state, moveCount: 3, status: "해결" });
    persistence.save(solved);

    const restored = fromPersisted(persistence.load("2026-06-23") as PersistedSession);
    expect(restored.status).toBe("해결");
    expect(restored.moveCount).toBe(3);
    expect(restored.score).toBe(3); // 직렬화엔 score 부재 → moveCount로 재유도
  });
});

describe("createMemoryPersistence — version 폐기 정책", () => {
  function rawSave(persistence: ReturnType<typeof createMemoryPersistence>, value: unknown, gameDate: string): void {
    // 어댑터 save는 PersistedSession 타입을 요구하므로, version 불일치 케이스는
    // 저장 시점의 직렬화를 우회해 같은 키 규약으로 강제 주입한다.
    persistence.save(value as PersistedSession);
    void gameDate;
  }

  it("version 불일치(과거)면 load가 폐기(null)한다", () => {
    const persistence = createMemoryPersistence();
    rawSave(persistence, { version: 0, gameDate: "2026-06-23", clueLog: [], moveCount: 0, status: "진행" }, "2026-06-23");
    expect(persistence.load("2026-06-23")).toBeNull();
  });

  it("version 불일치(미래값)면 load가 폐기(null)한다", () => {
    const persistence = createMemoryPersistence();
    rawSave(persistence, { version: 99, gameDate: "2026-06-23", clueLog: [], moveCount: 0, status: "진행" }, "2026-06-23");
    expect(persistence.load("2026-06-23")).toBeNull();
  });

  it("구조 결손(status 비정상)이면 폐기(null)한다", () => {
    const persistence = createMemoryPersistence();
    rawSave(persistence, { version: 1, gameDate: "2026-06-23", clueLog: [], moveCount: 0, status: "실패" }, "2026-06-23");
    expect(persistence.load("2026-06-23")).toBeNull();
  });

  it("정상 version(1)은 복원된다", () => {
    const persistence = createMemoryPersistence();
    persistence.save({ version: 1, gameDate: "2026-06-23", clueLog: [], moveCount: 0, status: "진행" });
    expect(persistence.load("2026-06-23")).not.toBeNull();
  });
});

describe("createLocalStoragePersistence — 취득 가드(접근 차단 환경)", () => {
  it("localStorage 접근 자체가 throw해도 팩토리가 안전 no-op으로 폴백한다", () => {
    // 샌드박스 iframe·스토리지 차단 origin: localStorage 식 평가가 SecurityError를 던진다.
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: localStorage is not available");
      },
    });
    try {
      let persistence: PersistenceAdapter | undefined;
      // 취득부 가드 전: 팩토리 호출 자체가 터졌다(회귀). 가드 후: no-op 어댑터로 폴백.
      expect(() => {
        persistence = createLocalStoragePersistence();
      }).not.toThrow();
      expect(persistence?.load("2026-06-23")).toBeNull();
      expect(() =>
        persistence?.save({ version: 1, gameDate: "2026-06-23", clueLog: [], moveCount: 0, status: "진행" }),
      ).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, "localStorage", original);
      else delete (globalThis as Record<string, unknown>).localStorage;
    }
  });
});
