import { describe, expect, it } from "vitest";
import { findExactCandidate, searchEligibleCandidates } from "./search";

describe("패널 게임 후보 검색", () => {
  it("한국어 부분 문자열로 검색한다", () => {
    const results = searchEligibleCandidates("피카");
    expect(results.some((candidate) => candidate.nameKo.includes("피카"))).toBe(true);
  });

  it("영문 부분 문자열로 검색한다", () => {
    const results = searchEligibleCandidates("char");
    expect(results.some((candidate) => candidate.nameEn.toLowerCase().includes("char"))).toBe(true);
  });

  it("초성으로 검색한다", () => {
    const results = searchEligibleCandidates("ㄱㄹㄷㅅ");
    expect(results.some((candidate) => candidate.nameKo === "갸라도스")).toBe(true);
  });

  it("정확한 이름이 하나면 exact candidate를 돌려준다", () => {
    expect(findExactCandidate("피카츄")?.id).toBe("pikachu");
  });
});
