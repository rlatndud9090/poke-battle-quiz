import { describe, expect, it } from "vitest";
import { getEffectiveness, getMultiplier, typeChart } from "./index";
import { POKEMON_TYPES } from "./types";

describe("타입 상성표", () => {
  it("알려진 단일 타입 상성", () => {
    expect(getMultiplier("water", "fire")).toBe(2);
    expect(getMultiplier("electric", "ground")).toBe(0);
    expect(getMultiplier("normal", "ghost")).toBe(0);
    expect(getMultiplier("fairy", "dragon")).toBe(2);
    expect(getMultiplier("steel", "fairy")).toBe(2);
    expect(getMultiplier("dragon", "fairy")).toBe(0);
    expect(getMultiplier("fire", "water")).toBe(0.5);
    expect(getMultiplier("normal", "normal")).toBe(1);
  });

  it("18타입 × 18타입 완전성 + 배수는 0/0.5/1/2만", () => {
    expect(POKEMON_TYPES.length).toBe(18);
    for (const atk of POKEMON_TYPES) {
      expect(typeChart[atk]).toBeDefined();
      for (const def of POKEMON_TYPES) {
        expect([0, 0.5, 1, 2]).toContain(typeChart[atk][def]);
      }
    }
  });

  it("복합 타입 방어 = 각 타입 배수의 곱 (x0.25~x4)", () => {
    expect(getEffectiveness("water", ["fire", "ground"])).toBe(4); // 2 * 2
    expect(getEffectiveness("electric", ["water", "flying"])).toBe(4); // 2 * 2
    expect(getEffectiveness("ground", ["flying"])).toBe(0); // 무효
    expect(getEffectiveness("grass", ["fire", "flying"])).toBe(0.25); // 0.5 * 0.5
    expect(getEffectiveness("normal", ["normal"])).toBe(1);
  });
});
