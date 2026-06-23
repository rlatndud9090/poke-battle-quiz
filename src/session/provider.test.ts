// Clue-only provider 검증 (ADR 검증: 추측 판정 + 정답 비노출 불변식 — provider 반환 경계)
//
// 권위: docs/raw/feature/guess-feedback-contract/adr.md `## 검증` + prd.md `## 수용 기준`.
// 구현 표면: src/session/provider.ts (createProvider) + dailyAnswer (정답을 테스트가 알아내 '부재' 단언).

import { describe, expect, it } from "vitest";
import { candidates } from "../data";
import { dailyAnswer } from "./dailyAnswer";
import { createProvider } from "./provider";

const GAME_DATE = "2026-06-23";

describe("createProvider — 추측 판정(정답/오답)", () => {
  it("정답 candidate id → correct=true + revealed(정답 nameKo·abilityId)", () => {
    const secret = dailyAnswer(GAME_DATE);
    const provider = createProvider(GAME_DATE);

    const result = provider.submitGuess(secret.candidate.id);
    expect(result.correct).toBe(true);
    expect(result.revealed).toEqual({
      candidateId: secret.candidate.id,
      nameKo: secret.candidate.nameKo,
      abilityId: secret.ability.id,
    });
  });

  it("오답 id → correct=false + revealed 부재", () => {
    const secret = dailyAnswer(GAME_DATE);
    const provider = createProvider(GAME_DATE);
    const wrongId = candidates.find((c) => c.id !== secret.candidate.id)?.id ?? "__none__";

    const result = provider.submitGuess(wrongId);
    expect(result.correct).toBe(false);
    expect(result.revealed).toBeUndefined();
  });

  it("entryClues / submitAction은 엔진 Clue만 반환(결정론)", () => {
    const provider = createProvider(GAME_DATE);
    const entry1 = provider.entryClues();
    const entry2 = provider.entryClues();
    expect(entry1).toEqual(entry2); // 결정론

    const a1 = provider.submitAction({ kind: "attack", attackType: "fire", category: "physical" });
    const a2 = provider.submitAction({ kind: "attack", attackType: "fire", category: "physical" });
    expect(a1).toEqual(a2);
    expect(a1).toHaveProperty("clues");
  });
});

describe("createProvider — 정답 비노출 불변식(진행 중 provider 반환 경계)", () => {
  // 정답은 테스트가 dailyAnswer로 알아내 '부재'를 단언한다(provider 내부 클로저는 새지 않아야 함).
  function answerStrings(gameDate: string): readonly string[] {
    const secret = dailyAnswer(gameDate);
    return [secret.candidate.id, secret.candidate.nameKo, secret.ability.id];
  }

  it("entryClues 직렬화 문자열에 정답 식별자 문자열 부재", () => {
    const provider = createProvider(GAME_DATE);
    const serialized = JSON.stringify(provider.entryClues());
    for (const needle of answerStrings(GAME_DATE)) {
      expect(serialized.includes(needle)).toBe(false);
    }
  });

  it("submitAction 반환 직렬화에 정답 식별자 문자열 부재", () => {
    const provider = createProvider(GAME_DATE);
    const result = provider.submitAction({ kind: "attack", attackType: "water", category: "special" });
    const serialized = JSON.stringify(result);
    for (const needle of answerStrings(GAME_DATE)) {
      expect(serialized.includes(needle)).toBe(false);
    }
  });

  it("오답 submitGuess 반환에 정답 식별자 문자열 부재", () => {
    const secret = dailyAnswer(GAME_DATE);
    const provider = createProvider(GAME_DATE);
    const wrongId = candidates.find((c) => c.id !== secret.candidate.id)?.id ?? "__none__";

    const serialized = JSON.stringify(provider.submitGuess(wrongId));
    for (const needle of answerStrings(GAME_DATE)) {
      expect(serialized.includes(needle)).toBe(false);
    }
  });

  it("해결(정답) 후에만 revealed로 정답 식별자가 공개된다", () => {
    const secret = dailyAnswer(GAME_DATE);
    const provider = createProvider(GAME_DATE);
    const serialized = JSON.stringify(provider.submitGuess(secret.candidate.id));
    // 해결 후에는 의도적으로 공개 — revealed에 정답 식별자가 담긴다.
    expect(serialized.includes(secret.candidate.id)).toBe(true);
    expect(serialized.includes(secret.candidate.nameKo)).toBe(true);
    expect(serialized.includes(secret.ability.id)).toBe(true);
  });

  it("여러 날짜에 대해서도 진행 중 반환에 그날 정답 식별자 부재(샘플링)", () => {
    // 보호 대상 = 정답을 '직접 특정'하는 식별자(candidateId·nameKo).
    // ⚠️ abilityId는 제외한다: 정답 ability가 marker/entry를 내는 경우(예: intimidate)
    //   단서 자체가 ability 정보를 드러내는 것은 ADR이 명시한 '게임 메커니즘상 의도된 정보 공개'다
    //   (adr.md `## 검증`·`부정적 영향`: 보호 대상은 정답 식별자 문자열, 단서의 후보 특정은 비위반).
    //   abilityId의 진짜 비노출(revealed 슬롯 부재)은 'ability 단서 없는 정답' 케이스로 별도 검증.
    const sampleDates = ["2026-01-14", "2026-04-04", "2026-08-07", "2027-03-15"];
    for (const gd of sampleDates) {
      const provider = createProvider(gd);
      const secret = dailyAnswer(gd);
      const wrongId = candidates.find((c) => c.id !== secret.candidate.id)?.id ?? "__none__";
      const blob = JSON.stringify([
        provider.entryClues(),
        provider.submitAction({ kind: "stat", stat: "atk", stages: -1 }),
        provider.submitGuess(wrongId),
      ]);
      for (const needle of [secret.candidate.id, secret.candidate.nameKo]) {
        expect(blob.includes(needle)).toBe(false);
      }
    }
  });

  it("등장 단서가 ability를 드러내지 않는 정답에선 진행 중 abilityId도 부재(다중 날짜)", () => {
    // entry 슬롯 없는 정답을 스캔으로 여러 개 수집(데이터 변경에 견고, 상수 하드코딩 금지).
    // candidateId/nameKo와 동등 강도로 abilityId 부재를 다중 날짜에 단언.
    const DAY_MS = 86_400_000;
    const start = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
    const emptyDates: string[] = [];
    for (let i = 0; i < 4000 && emptyDates.length < 3; i += 1) {
      const gd = new Date((start + i) * DAY_MS).toISOString().slice(0, 10);
      if (createProvider(gd).entryClues().length === 0) emptyDates.push(gd);
    }
    expect(emptyDates.length).toBe(3);

    for (const gd of emptyDates) {
      const provider = createProvider(gd);
      const secret = dailyAnswer(gd);
      const wrongId = candidates.find((c) => c.id !== secret.candidate.id)?.id ?? "__none__";
      const blob = JSON.stringify([
        provider.entryClues(),
        provider.submitAction({ kind: "attack", attackType: "fire", category: "physical" }),
        provider.submitGuess(wrongId),
      ]);
      // 이 정답은 단서가 ability를 드러내지 않으므로 abilityId도 진행 중 완전 부재.
      for (const needle of [secret.candidate.id, secret.candidate.nameKo, secret.ability.id]) {
        expect(blob.includes(needle)).toBe(false);
      }
    }
  });
});
