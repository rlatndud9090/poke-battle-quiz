import { describe, expect, it } from "vitest";
import { eligibleCandidates } from "./metadata";
import { getTodayPanelAnswer, selectPanelAnswer } from "./answer";

describe("패널 게임 정답 선택", () => {
  it("같은 날짜에는 같은 정답을 선택한다", () => {
    const first = selectPanelAnswer("2026-07-01");
    const second = selectPanelAnswer("2026-07-01");

    expect(first.candidate.id).toBe(second.candidate.id);
    expect(first.ability.id).toBe(second.ability.id);
  });

  it("eligible 후보군 안에서만 정답을 고른다", () => {
    const answer = selectPanelAnswer("2026-07-01");
    expect(eligibleCandidates.some((candidate) => candidate.id === answer.candidate.id)).toBe(true);
  });

  it("현재 시각 기준 today 정답도 선택할 수 있다", () => {
    const answer = getTodayPanelAnswer(Date.UTC(2026, 6, 1), 0);
    expect(answer.candidate.id.length).toBeGreaterThan(0);
    expect(answer.ability.id.length).toBeGreaterThan(0);
  });
});
