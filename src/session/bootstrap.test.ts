// 부트스트랩 통합 검증 (ADR 검증: 등장 단서 멱등(provider 경로) + 정답 비노출(세션 직렬화) + 영속 복원)
//
// 권위: docs/raw/feature/guess-feedback-contract/adr.md `## 검증` + prd.md `## 수용 기준`.
// 구현 표면: src/session/index.ts (bootstrapGame / submitActionStep / submitGuessStep) + dailyAnswer.
//
// dailyAnswer는 데이터(N) 의존이라 정답 날짜를 하드코딩하지 않고 스캔으로 동적 발견한다(상수 금지).

import { describe, expect, it } from "vitest";
import { entryClues as engineEntryClues } from "../engine";
import {
  bootstrapGame,
  createMemoryPersistence,
  submitActionStep,
  submitGuessStep,
  toPersisted,
  toSessionView,
} from "./index";
import { dailyAnswer } from "./dailyAnswer";

const DAY_MS = 86_400_000;

/** 등장 단서가 주어진 kind를 내는 첫 GameDate를 스캔으로 찾는다(데이터 변경에 견고). */
function findGameDateWithEntryKind(kind: Clue["kind"]): string {
  const start = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
  for (let i = 0; i < 4000; i += 1) {
    const gd = new Date((start + i) * DAY_MS).toISOString().slice(0, 10);
    const clues = engineEntryClues(dailyAnswer(gd));
    if (clues.some((c) => c.kind === kind)) return gd;
  }
  throw new Error(`등장 ${kind} 단서를 내는 GameDate를 스캔 범위에서 못 찾음`);
}

/** 등장 단서가 비어 있는(entry 슬롯 없는) 첫 GameDate. */
function findGameDateWithoutEntry(): string {
  const start = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
  for (let i = 0; i < 4000; i += 1) {
    const gd = new Date((start + i) * DAY_MS).toISOString().slice(0, 10);
    if (engineEntryClues(dailyAnswer(gd)).length === 0) return gd;
  }
  throw new Error("등장 단서가 빈 GameDate를 못 찾음");
}

// engine Clue 타입 재선언(import 순환 회피용 — 구조만 필요).
type Clue = ReturnType<typeof engineEntryClues>[number];

const MARKER_DATE = findGameDateWithEntryKind("marker");
const RANK_DATE = findGameDateWithEntryKind("rank");
const ENTRY_DATE = findGameDateWithEntryKind("entry");
const EMPTY_DATE = findGameDateWithoutEntry();

describe("bootstrapGame — 새 게임: 등장 단서 1회 흡수", () => {
  it.each([
    ["marker(intimidate)", () => MARKER_DATE],
    ["rank(자신 부스트)", () => RANK_DATE],
    ["entry(날씨)", () => ENTRY_DATE],
  ])("%s 정답: 시작 시 등장 단서가 clueLog에 1회 흡수된다", (_label, getDate) => {
    const gameDate = getDate();
    const persistence = createMemoryPersistence();
    const { state, provider } = bootstrapGame(gameDate, { persistence });

    expect(state.clueLog).toEqual([...provider.entryClues()]);
    expect(state.clueLog.length).toBeGreaterThan(0);
    expect(state.moveCount).toBe(0); // 등장은 move가 아니다
  });

  it("entry 슬롯 없는 정답은 빈 clueLog로 시작", () => {
    const persistence = createMemoryPersistence();
    const { state } = bootstrapGame(EMPTY_DATE, { persistence });
    expect(state.clueLog).toEqual([]);
  });
});

describe("bootstrapGame — 복원: 등장 단서 멱등(재흡수·중복 0)", () => {
  it.each([
    ["marker(intimidate)", () => MARKER_DATE],
    ["rank(자신 부스트)", () => RANK_DATE],
    ["entry(날씨)", () => ENTRY_DATE],
  ])("%s 정답: 재부트스트랩(새로고침)해도 등장 단서가 중복 누적되지 않는다", (_label, getDate) => {
    const gameDate = getDate();
    const persistence = createMemoryPersistence();

    const first = bootstrapGame(gameDate, { persistence }); // 새 게임 + 저장
    const firstLen = first.state.clueLog.length;

    // 새로고침 = 같은 persistence로 재부트스트랩 → 복원 경로(등장 재흡수 없음).
    const second = bootstrapGame(gameDate, { persistence });
    expect(second.state.clueLog).toEqual(first.state.clueLog);
    expect(second.state.clueLog.length).toBe(firstLen); // 중복 0
  });
});

describe("submitActionStep / submitGuessStep — 행동·추측 통합 흐름 + 영속", () => {
  it("행동→단서 누적 + move +1 + 저장된다", () => {
    const persistence = createMemoryPersistence();
    let session = bootstrapGame(EMPTY_DATE, { persistence });

    session = submitActionStep(
      session,
      { kind: "attack", attackType: "fire", category: "physical" },
      persistence,
    );
    expect(session.state.moveCount).toBe(1);

    // 영속에 반영됐는지 — 재부트스트랩으로 복원해 확인.
    const reloaded = bootstrapGame(EMPTY_DATE, { persistence });
    expect(reloaded.state.moveCount).toBe(1);
    expect(reloaded.state.clueLog).toEqual(session.state.clueLog);
  });

  it("정답 추측 → 해결 + score = 총 move 수 + revealed 공개", () => {
    const persistence = createMemoryPersistence();
    let session = bootstrapGame(EMPTY_DATE, { persistence });
    const secret = dailyAnswer(EMPTY_DATE);

    session = submitActionStep(
      session,
      { kind: "stat", stat: "atk", stages: 1 },
      persistence,
    ); // move 1
    session = submitGuessStep(session, "definitely-wrong-id", persistence); // move 2 오답
    session = submitGuessStep(session, secret.candidate.id, persistence); // move 3 정답

    expect(session.state.status).toBe("해결");
    expect(session.state.moveCount).toBe(3);
    expect(session.state.score).toBe(3);
    expect(session.state.revealed?.candidateId).toBe(secret.candidate.id);
    expect(session.state.revealed?.nameKo).toBe(secret.candidate.nameKo);
    expect(session.state.revealed?.abilityId).toBe(secret.ability.id);
  });

  it("해결 후 복원하면 revealed가 정답 재유도로 다시 채워진다(저장엔 없음)", () => {
    const persistence = createMemoryPersistence();
    const session = bootstrapGame(EMPTY_DATE, { persistence });
    const secret = dailyAnswer(EMPTY_DATE);
    submitGuessStep(session, secret.candidate.id, persistence); // 해결(persistence에 저장)

    const reloaded = bootstrapGame(EMPTY_DATE, { persistence });
    expect(reloaded.state.status).toBe("해결");
    expect(reloaded.state.revealed?.candidateId).toBe(secret.candidate.id);
  });
});

describe("정답 비노출 불변식 — 세션 직렬화(진행 중)", () => {
  // status='진행' 동안 toPersisted/JSON.stringify 문자열에 정답 식별자·시드/순열 상태 부재.
  // 정답을 '직접 특정'하는 식별자(candidateId·nameKo)는 어떤 정답에서도 부재해야 한다.
  function directIdentifiers(gameDate: string): readonly string[] {
    const secret = dailyAnswer(gameDate);
    return [secret.candidate.id, secret.candidate.nameKo];
  }
  // abilityId는 정답 ability가 marker/entry를 내면 단서로 '의도 노출'되므로,
  // 단서가 ability를 안 드러내는 정답(EMPTY_DATE)에서만 완전 부재를 단언한다(adr.md 보호 대상 정의).
  function allIdentifiers(gameDate: string): readonly string[] {
    const secret = dailyAnswer(gameDate);
    return [secret.candidate.id, secret.candidate.nameKo, secret.ability.id];
  }

  it.each([
    ["등장 marker 정답(직접 식별자만)", () => MARKER_DATE, directIdentifiers],
    ["entry 없는 정답(식별자 전부)", () => EMPTY_DATE, allIdentifiers],
  ])("%s: 진행 중 세션 직렬화에 부재", (_label, getDate, needles) => {
    const gameDate = getDate();
    const persistence = createMemoryPersistence();
    let session = bootstrapGame(gameDate, { persistence });
    session = submitActionStep(
      session,
      { kind: "attack", attackType: "water", category: "special" },
      persistence,
    );
    session = submitGuessStep(session, "wrong-guess-id", persistence); // 오답(진행 유지)

    expect(session.state.status).toBe("진행");
    const serialized = JSON.stringify(toPersisted(session.state));
    for (const needle of needles(gameDate)) {
      expect(serialized.includes(needle)).toBe(false);
    }
  });

  it("진행 중 SessionView 직렬화에도 정답 식별자 부재(revealed 미공개)", () => {
    const persistence = createMemoryPersistence();
    let session = bootstrapGame(EMPTY_DATE, { persistence });
    session = submitGuessStep(session, "wrong-id", persistence);
    const view = toSessionView(session.state);
    expect(view.revealed).toBeUndefined();
    const serialized = JSON.stringify(view);
    for (const needle of allIdentifiers(EMPTY_DATE)) {
      expect(serialized.includes(needle)).toBe(false);
    }
  });

  it.each([
    ["entry 없는 정답(빈 clueLog)", () => EMPTY_DATE],
    ["등장 marker 정답(clueLog 채워짐)", () => MARKER_DATE],
    ["등장 rank 정답(clueLog 채워짐)", () => RANK_DATE],
  ])("%s: 직렬화에 시드 유도 상태(seed·permutation·cycle) 키 부재", (_label, getDate) => {
    // 시드/순열 유도 상태는 어떤 정답에서도 직렬화에 없다(게임 날짜만으로 재유도).
    // ⚠️ 'secret'·'ability'는 엔진 Clue 정상 필드명과 충돌한다(rank 단서의 target:"secret" 등) —
    //   이는 정답 유출이 아니라 단서 스키마라, 단서 없는 정답(EMPTY)에서만 별도로 부재 단언한다.
    const persistence = createMemoryPersistence();
    const { state } = bootstrapGame(getDate(), { persistence });
    const serialized = JSON.stringify(toPersisted(state)).toLowerCase();
    for (const forbidden of ["seed", "permutation", "cycle"]) {
      expect(serialized.includes(forbidden)).toBe(false);
    }
  });

  it("단서 없는 정답(EMPTY)은 직렬화에 'secret'·'ability' 키도 부재", () => {
    // EMPTY_DATE = 단서가 정답 유도 상태를 일절 안 내는 정답 → secret/ability 부분문자열도 없다.
    const persistence = createMemoryPersistence();
    const { state } = bootstrapGame(EMPTY_DATE, { persistence });
    const serialized = JSON.stringify(toPersisted(state)).toLowerCase();
    for (const forbidden of ["secret", "ability"]) {
      expect(serialized.includes(forbidden)).toBe(false);
    }
  });

  it("해결(status='해결') 후에도 영속 직렬화엔 정답 식별자 부재(revealed 미저장)", () => {
    // P5 회귀 고정: revealed는 영속에 저장되지 않는다 — 복원 시 정답 재유도로 채운다.
    const persistence = createMemoryPersistence();
    const session = bootstrapGame(EMPTY_DATE, { persistence });
    const secret = dailyAnswer(EMPTY_DATE);
    const solved = submitGuessStep(session, secret.candidate.id, persistence); // 해결
    expect(solved.state.status).toBe("해결");

    const serialized = JSON.stringify(toPersisted(solved.state));
    expect(serialized.includes(secret.candidate.id)).toBe(false);
    expect(serialized.includes(secret.candidate.nameKo)).toBe(false);
    expect(serialized.includes(secret.ability.id)).toBe(false);
  });

  it("해결 후엔 SessionView.revealed로 정답이 의도적으로 공개된다", () => {
    const persistence = createMemoryPersistence();
    let session = bootstrapGame(EMPTY_DATE, { persistence });
    const secret = dailyAnswer(EMPTY_DATE);
    session = submitGuessStep(session, secret.candidate.id, persistence);
    const serialized = JSON.stringify(toSessionView(session.state));
    expect(serialized.includes(secret.candidate.id)).toBe(true);
    expect(serialized.includes(secret.candidate.nameKo)).toBe(true);
  });
});
