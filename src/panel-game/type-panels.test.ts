import { describe, expect, it } from "vitest";
import { getCandidate } from "../data";
import { formatTypeMultiplier, getTypePanelMultiplier } from "./type-panels";
import type { PanelGameAnswer } from "./types";

function answerOf(candidateId: string, abilityId?: string): PanelGameAnswer {
  const candidate = getCandidate(candidateId)!;
  const ability = abilityId
    ? candidate.abilities.find((entry) => entry.id === abilityId)!
    : candidate.abilities[0];
  return { candidate, ability };
}

describe("타입 패널 계산", () => {
  it("타입 기반 면역과 특성 기반 면역을 x0으로 보여준다", () => {
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("pikachu"), "ground"))).toBe("x2");
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("weezing-galar", "levitate"), "ground"))).toBe("x0");
  });

  it("두꺼운지방 같은 방어 배율 감소를 반영한다", () => {
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("venusaur-mega", "thick-fat"), "fire"))).toBe("x1");
  });

  it("filter 계열 술어를 반영한다", () => {
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("rhyperior", "solid-rock"), "water"))).toBe("x3");
  });

  it("wonder guard를 단순화 규칙대로 반영한다", () => {
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("shedinja", "wonder-guard"), "water"))).toBe("x0");
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("shedinja", "wonder-guard"), "fire"))).toBe("x2");
  });

  it("battle-only로 남긴 분류/HP 의존 효과는 타입 패널에 반영하지 않는다", () => {
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("dragonite", "multiscale"), "ice"))).toBe("x4");
    expect(formatTypeMultiplier(getTypePanelMultiplier(answerOf("furfrou", "fur-coat"), "fighting"))).toBe("x2");
  });
});
