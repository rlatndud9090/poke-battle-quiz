import { describe, expect, it } from "vitest";
import { allCandidates, candidates, candidatesBySpecies, getCandidate, meta } from "./index";
import { POKEMON_TYPES } from "./types";

const typeSet = new Set<string>(POKEMON_TYPES);

describe("포켓몬 데이터셋", () => {
  it("모수: 메타와 일치, 스냅샷 고정 기대값", () => {
    expect(candidates.length).toBe(meta.totalCandidates);
    // 스냅샷 652ba55 기준 (원종 1025 − 블랙리스트 2 + 타입/특성 변경 폼 190)
    expect(meta.totalCandidates).toBe(1213);
    expect(meta.baseSpeciesCount).toBe(1023);
    expect(meta.formCount).toBe(190);
  });

  it("모든 후보가 스키마를 만족한다", () => {
    for (const c of allCandidates()) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(Number.isInteger(c.speciesId)).toBe(true);
      expect(c.speciesId).toBeGreaterThanOrEqual(1);
      expect(c.types.length).toBeGreaterThanOrEqual(1);
      expect(c.types.length).toBeLessThanOrEqual(2);
      expect(c.types.every((t) => typeSet.has(t))).toBe(true);
      expect(c.abilities.length).toBeGreaterThanOrEqual(1);
      expect(c.generation).toBeGreaterThanOrEqual(1);
      expect(c.generation).toBeLessThanOrEqual(9);
      expect(c.nameKo.length).toBeGreaterThan(0);
      expect(c.nameEn.length).toBeGreaterThan(0);
      expect(["base", "mega", "primal", "regional", "other"]).toContain(c.formCategory);
    }
  });

  it("폼 포함 정책 — 타입/특성이 원종과 다른 폼", () => {
    const ids = new Set(candidates.map((c) => c.id));
    expect(ids.has("vulpix-alola")).toBe(true); // 타입 변경
    expect(ids.has("charizard-mega-x")).toBe(true); // 타입+특성 변경
    expect(ids.has("kyogre-primal")).toBe(true); // 특성 변경
  });

  it("폼 제외 정책 — gmax·동일폼·블랙리스트", () => {
    const ids = new Set(candidates.map((c) => c.id));
    expect(ids.has("charizard-gmax")).toBe(false); // 원종과 동일(외형만)
    expect(candidates.some((c) => c.speciesName === "arceus")).toBe(false); // 블랙리스트
    expect(candidates.some((c) => c.speciesName === "silvally")).toBe(false); // 블랙리스트
    expect(candidates.filter((c) => c.speciesName === "deoxys").length).toBe(1); // 외형폼 제외, 원종만
  });

  it("지역폼 타입·이름 합성", () => {
    const va = getCandidate("vulpix-alola");
    expect(va?.types).toEqual(["ice"]);
    expect(va?.formCategory).toBe("regional");
    expect(va?.nameKo).toBe("알로라 식스테일");
    expect(va?.nameEn).toBe("Alolan Vulpix");

    const na = getCandidate("ninetales-alola");
    expect(na?.types).toEqual(["ice", "fairy"]);
  });

  it("speciesId로 같은 종의 폼을 그룹핑한다", () => {
    const chari = candidatesBySpecies(6).map((c) => c.id);
    expect(chari).toContain("charizard");
    expect(chari).toContain("charizard-mega-x");
    expect(chari).toContain("charizard-mega-y");
    expect(chari).not.toContain("charizard-gmax");
  });

  it("블랙리스트 종이 누수되지 않는다", () => {
    expect(meta.blacklistedSpecies).toEqual(expect.arrayContaining(["arceus", "silvally"]));
  });
});
