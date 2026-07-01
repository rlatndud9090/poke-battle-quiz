import { eligibleCandidates } from "./metadata";
import type { Candidate } from "../data";

const CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toChoseong(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const index = Math.floor((code - 0xac00) / 588);
      result += CHOSEONG[index];
    } else {
      result += char;
    }
  }
  return result;
}

function matches(candidate: Candidate, query: string): boolean {
  const normalized = normalize(query);
  if (!normalized) return true;
  return (
    candidate.nameKo.toLowerCase().includes(normalized) ||
    candidate.nameEn.toLowerCase().includes(normalized) ||
    toChoseong(candidate.nameKo).includes(normalized)
  );
}

export function searchEligibleCandidates(query: string, limit = 12): Candidate[] {
  const results: Candidate[] = [];
  for (const candidate of eligibleCandidates) {
    if (!matches(candidate, query)) continue;
    results.push(candidate);
    if (results.length >= limit) break;
  }
  return results;
}

export function findExactCandidate(query: string): Candidate | undefined {
  const normalized = normalize(query);
  if (!normalized) return undefined;
  const matches = eligibleCandidates.filter(
    (candidate) =>
      candidate.nameKo.toLowerCase() === normalized || candidate.nameEn.toLowerCase() === normalized,
  );
  return matches.length === 1 ? matches[0] : undefined;
}
