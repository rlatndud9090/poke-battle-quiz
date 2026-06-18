// 배틀 판정 엔진 — 화이트리스트 정합 검증 (domain-engineer 작성, 청사진 6절·8절)
//
// 검증 범위(테스트 로직이 아니라 데이터 정합):
//  1. 전 레코드 nameKo가 고정 SHA api-data 권위 ko명 맵과 일치 + 누락 0.
//  2. 모든 슬러그가 데이터셋 308종(실재 특성) 내에 존재.
//  3. 레코드 키 === record.slug (오타·키 불일치 방지).
//  4. 다중 트랙 특성(6종)의 슬롯이 빠짐없이 채워짐.
//  5. attack 슬롯 배열/단일 모두 유효(dry-skin 복합 등).
//
// 권위 ko명 맵 fixture: ./__fixtures__/authority-ability-names.json
//   = 고정 SHA api-data ability/<id> names[ko]에서 화이트리스트 슬러그만 추출(결정론).
//   원본 권위 맵: 고정 SHA PokéAPI api-data 652ba55…

import { describe, expect, it } from "vitest";
import pokemonData from "../data/pokemon.json";
import type { Candidate } from "../data/types";
import { ABILITY_WHITELIST } from "./abilities";
import authorityNames from "./__fixtures__/authority-ability-names.json";

const records = Object.values(ABILITY_WHITELIST);

// 데이터셋에 실재하는 고유 특성 슬러그 집합(308종).
const datasetSlugs = new Set<string>();
for (const candidate of pokemonData as unknown as Candidate[]) {
  for (const ability of candidate.abilities) datasetSlugs.add(ability.id);
}

const authority = authorityNames as Record<string, string>;

describe("화이트리스트 정합", () => {
  it("레코드가 0개가 아니고 모든 키 === record.slug", () => {
    expect(records.length).toBeGreaterThan(0);
    for (const [key, record] of Object.entries(ABILITY_WHITELIST)) {
      expect(record.slug).toBe(key);
    }
  });

  it("데이터셋 고유 특성은 308종이고 모든 슬러그가 그 안에 실재한다", () => {
    expect(datasetSlugs.size).toBe(308);
    for (const record of records) {
      expect(datasetSlugs.has(record.slug)).toBe(true);
    }
  });

  it("전 레코드 nameKo가 권위 ko명 맵과 일치(누락 0)", () => {
    for (const record of records) {
      const authorityKo = authority[record.slug];
      expect(authorityKo, `권위 맵에 ${record.slug} 누락`).toBeDefined();
      expect(record.nameKo, `${record.slug} nameKo 불일치`).toBe(authorityKo);
    }
  });

  it("권위 fixture 모든 슬러그가 화이트리스트에 존재(양방향 누락 0)", () => {
    const whitelistSlugs = new Set(records.map((r) => r.slug));
    for (const slug of Object.keys(authority)) {
      expect(whitelistSlugs.has(slug), `화이트리스트에 ${slug} 누락`).toBe(true);
    }
  });

  it("각 레코드는 최소 1개 트랙 슬롯을 채운다(빈 레코드 금지)", () => {
    for (const record of records) {
      const hasSlot = Boolean(record.attack ?? record.entry ?? record.status ?? record.stat);
      expect(hasSlot, `${record.slug} 트랙 슬롯 없음`).toBe(true);
    }
  });
});

describe("다중 트랙 특성 슬롯 누락 없음", () => {
  // 청사진 8절: 다중 트랙 특성의 슬롯 누락 주의.
  it("dry-skin = 공격 배열(물면역 + 불1.25)", () => {
    const r = ABILITY_WHITELIST["dry-skin"];
    expect(Array.isArray(r.attack)).toBe(true);
    const arr = r.attack as unknown[];
    expect(arr).toHaveLength(2);
  });

  it("purifying-salt = 공격(고스트0.5) + 상태(전상태면역)", () => {
    const r = ABILITY_WHITELIST["purifying-salt"];
    expect(r.attack).toBeDefined();
    expect(r.status).toBeDefined();
  });

  it("water-bubble = 공격(불0.5) + 상태(화상면역)", () => {
    const r = ABILITY_WHITELIST["water-bubble"];
    expect(r.attack).toBeDefined();
    expect(r.status).toBeDefined();
  });

  it("thermal-exchange = 상태(화상면역) + 공격(불 피격랭크)", () => {
    const r = ABILITY_WHITELIST["thermal-exchange"];
    expect(r.status).toBeDefined();
    expect(r.attack).toBeDefined();
  });

  it("desolate-land = 공격(물x0 술어) + 등장(강한햇살)", () => {
    const r = ABILITY_WHITELIST["desolate-land"];
    expect(r.attack).toBeDefined();
    expect(r.entry).toBeDefined();
  });

  it("primordial-sea = 공격(불x0 술어) + 등장(강한비)", () => {
    const r = ABILITY_WHITELIST["primordial-sea"];
    expect(r.attack).toBeDefined();
    expect(r.entry).toBeDefined();
  });
});
