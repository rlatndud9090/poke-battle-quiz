// 포켓몬 데이터 계약 — 로더 + 조회 헬퍼
// 정적 산출물(pokemon.json / typechart.json / meta.json)을 import해 도메인 코드에 제공한다.
// 런타임 외부 fetch 없음(ADR: 빌드/런타임은 커밋된 정적 데이터만 사용).

import candidatesData from "./pokemon.json";
import typeChartData from "./typechart.json";
import metaData from "./meta.json";
import type { Candidate, DataMeta, Multiplier, PokemonType, TypeChart } from "./types";

export * from "./types";

/** 전체 정답 후보 (원종 + 타입/특성이 다른 폼) */
export const candidates = candidatesData as unknown as Candidate[];
/** 18×18 타입 상성표 */
export const typeChart = typeChartData as unknown as TypeChart;
/** 산출물 메타데이터 (출처·스냅샷 SHA·모수·제외 내역) */
export const meta = metaData as unknown as DataMeta;

const byId = new Map<string, Candidate>(candidates.map((c) => [c.id, c]));

/** 폼 고유 id로 후보 단건 조회 */
export function getCandidate(id: string): Candidate | undefined {
  return byId.get(id);
}

/** 전체 후보 목록 */
export function allCandidates(): readonly Candidate[] {
  return candidates;
}

/** 단일 공격 타입 → 단일 방어 타입 배수 */
export function getMultiplier(attacker: PokemonType, defender: PokemonType): Multiplier {
  return typeChart[attacker][defender];
}

/**
 * 단일 공격 타입이 (복합) 방어 타입 묶음에 대해 갖는 최종 배수.
 * 각 방어 타입 배수의 곱 (x0.25 ~ x4, 무효 0).
 */
export function getEffectiveness(attacker: PokemonType, defenderTypes: readonly PokemonType[]): number {
  return defenderTypes.reduce<number>((acc, def) => acc * typeChart[attacker][def], 1);
}

/** 같은 원종(speciesId)에 속한 후보들(원종 + 그 폼들) */
export function candidatesBySpecies(speciesId: number): Candidate[] {
  return candidates.filter((c) => c.speciesId === speciesId);
}
