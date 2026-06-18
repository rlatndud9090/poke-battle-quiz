import { describe, expect, it } from "vitest";
import { allCandidates, candidates, candidatesBySpecies, getCandidate, meta } from "./index";
import { POKEMON_TYPES } from "./types";

const typeSet = new Set<string>(POKEMON_TYPES);

describe("포켓몬 데이터셋", () => {
  it("모수: 메타와 일치, 스냅샷 고정 기대값", () => {
    expect(candidates.length).toBe(meta.totalCandidates);
    // 스냅샷 652ba55 기준 (원종 1025 − 블랙리스트 2 + 타입/특성 변경 폼 186; gmax·totem 제외)
    expect(meta.totalCandidates).toBe(1209);
    expect(meta.baseSpeciesCount).toBe(1023);
    expect(meta.formCount).toBe(186);
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

  it("폼 제외 정책 — gmax·totem·동일폼·블랙리스트", () => {
    const ids = new Set(candidates.map((c) => c.id));
    expect(ids.has("charizard-gmax")).toBe(false); // 원종과 동일(외형만)
    expect(candidates.some((c) => c.id.includes("-gmax"))).toBe(false); // gmax 전수 제외
    expect(candidates.some((c) => c.id.includes("-totem"))).toBe(false); // totem 전수 제외(리전폼과 중복)
    expect(candidates.some((c) => c.speciesName === "arceus")).toBe(false); // 블랙리스트
    expect(candidates.some((c) => c.speciesName === "silvally")).toBe(false); // 블랙리스트
    expect(candidates.filter((c) => c.speciesName === "deoxys").length).toBe(1); // 외형폼 제외, 원종만
  });

  it("지역폼 타입·이름 합성 — 간결 괄호 형식", () => {
    const va = getCandidate("vulpix-alola");
    expect(va?.types).toEqual(["ice"]);
    expect(va?.formCategory).toBe("regional");
    expect(va?.nameKo).toBe("식스테일(알로라)");
    expect(va?.nameEn).toBe("Alolan Vulpix");

    const na = getCandidate("ninetales-alola");
    expect(na?.types).toEqual(["ice", "fairy"]);
    expect(na?.nameKo).toBe("나인테일(알로라)");
  });

  it("타입이 다른 폼은 구분 가능한 이름을 가진다 (리전 먼저)", () => {
    // 켄타로스 팔데아 3종: 타입이 모두 다르므로 이름이 충돌하면 안 된다
    expect(getCandidate("tauros-paldea-combat-breed")?.nameKo).toBe("켄타로스(팔데아/컴뱃종)");
    expect(getCandidate("tauros-paldea-blaze-breed")?.nameKo).toBe("켄타로스(팔데아/블레이즈종)");
    expect(getCandidate("tauros-paldea-aqua-breed")?.nameKo).toBe("켄타로스(팔데아/아쿠아종)");
    // 리전+서브폼: 리전을 먼저 표기
    expect(getCandidate("darmanitan-galar-zen")?.nameKo).toBe("불비달마(가라르/달마모드)");
    expect(getCandidate("darmanitan-galar-standard")?.nameKo).toBe("불비달마(가라르)");
    // X/Y 메가 구분
    expect(getCandidate("raichu-mega-x")?.nameKo).toBe("메가 라이츄 X");
    expect(getCandidate("raichu-mega-y")?.nameKo).toBe("메가 라이츄 Y");
  });

  it("표시 이름(nameKo)은 후보 전체에서 유일하다", () => {
    const counts = new Map<string, number>();
    for (const c of candidates) counts.set(c.nameKo, (counts.get(c.nameKo) ?? 0) + 1);
    const dups = [...counts.entries()].filter(([, n]) => n > 1).map(([n]) => n);
    expect(dups).toEqual([]);
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
