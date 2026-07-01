import { describe, expect, it } from "vitest";
import { candidates } from "../data";
import { getPanelMetadata, panelMetadata } from "./metadata";

describe("패널 메타데이터", () => {
  it("모든 candidate에 대해 메타데이터가 있다", () => {
    expect(panelMetadata).toHaveLength(candidates.length);
  });

  it("합의한 포함/제외 예시를 만족한다", () => {
    expect(getPanelMetadata("tauros-paldea-aqua-breed").eligible).toBe(true);
    expect(getPanelMetadata("oricorio-pau").eligible).toBe(true);
    expect(getPanelMetadata("ogerpon-cornerstone-mask").eligible).toBe(true);

    expect(getPanelMetadata("charizard-mega-x").eligible).toBe(false);
    expect(getPanelMetadata("kyogre-primal").eligible).toBe(false);
    expect(getPanelMetadata("greninja-battle-bond").eligible).toBe(false);
    expect(getPanelMetadata("meowstic-female").eligible).toBe(false);
  });

  it("대표 excluded 이유를 기록한다", () => {
    expect(getPanelMetadata("charizard-mega-x").eligibilityReason).toBe("excluded:mega");
    expect(getPanelMetadata("greninja-battle-bond").eligibilityReason).toBe("excluded:special-form");
  });
});
