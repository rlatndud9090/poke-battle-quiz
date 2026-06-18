// 배틀 판정 엔진 — judge/entryClues 통합 동작(behavioral) 테스트 (test-engineer 작성).
//
// 권위 기준: docs/raw/feature/battle-judgment-engine/adr.md `## 검증` 섹션 전 항목 매핑.
// 독립 검증: 구현 표면(index/types/abilities/tracks/predicates)을 읽고 ADR 기대값으로 단언.
//
// 픽스처 정책: 결정론 보장을 위해 "최소 합성 Secret"을 쓴다.
//  - attack 트랙은 secret.candidate.types + secret.ability.id 만,
//    그 외 트랙·등장은 secret.ability.id 만 본다(구현 표면 확인).
//  - 합성 Candidate는 data/types의 Candidate 타입을 만족(실데이터 변경에 깨지지 않음).
//  - 배율은 typechart.json의 18×18 사실에만 의존(이 사실은 data 계약이 고정).
//
// Clue 매칭 규약: 배열에서 kind로 find 후 필드 단언(순서 의존 회피). 배율은 toBeCloseTo.

import { describe, expect, it } from "vitest";
import type { Ability, Candidate, PokemonType } from "../data/types";
import { entryClues, judge } from "./index";
import type { Action, Clue, Secret, StatId, StatusId } from "./types";

// ── 합성 픽스처 헬퍼 ──

/** 최소 합성 Candidate (Candidate 타입 만족). 판정에 쓰이는 건 types뿐. */
function makeCandidate(types: PokemonType[]): Candidate {
  return {
    id: "synthetic",
    speciesId: 0,
    speciesName: "synthetic",
    isDefault: true,
    formCategory: "base",
    types,
    abilities: [],
    generation: 1,
    nameKo: "합성",
    nameEn: "synthetic",
  };
}

/** Secret = { candidate(types만 의미), ability(id=슬러그) }. */
function makeSecret(types: PokemonType[], abilitySlug: string): Secret {
  const ability: Ability = { id: abilitySlug, hidden: false };
  return { candidate: makeCandidate(types), ability };
}

const attack = (attackType: PokemonType, category: "physical" | "special" = "physical"): Action => ({
  kind: "attack",
  attackType,
  category,
});
const status = (s: StatusId): Action => ({ kind: "status", status: s });
const stat = (s: StatId, stages: number): Action => ({ kind: "stat", stat: s, stages });

// ── Clue 추출 헬퍼 (kind로 find, 순서 의존 회피) ──

function damageOf(clues: readonly Clue[]): Extract<Clue, { kind: "damage" }> {
  const c = clues.find((x) => x.kind === "damage");
  if (!c || c.kind !== "damage") throw new Error("damage Clue 없음");
  return c;
}
function ranks(clues: readonly Clue[]): Extract<Clue, { kind: "rank" }>[] {
  return clues.filter((x): x is Extract<Clue, { kind: "rank" }> => x.kind === "rank");
}
function rankFor(clues: readonly Clue[], statId: StatId): Extract<Clue, { kind: "rank" }> | undefined {
  return ranks(clues).find((r) => r.stat === statId);
}
function statusOf(clues: readonly Clue[]): Extract<Clue, { kind: "status" }> | undefined {
  return clues.find((x): x is Extract<Clue, { kind: "status" }> => x.kind === "status");
}
function markers(clues: readonly Clue[]): Extract<Clue, { kind: "marker" }>[] {
  return clues.filter((x): x is Extract<Clue, { kind: "marker" }> => x.kind === "marker");
}
function entriesOf(clues: readonly Clue[]): Extract<Clue, { kind: "entry" }>[] {
  return clues.filter((x): x is Extract<Clue, { kind: "entry" }> => x.kind === "entry");
}

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 1: 공격 타입배율 (근사 비교)
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 1 · 공격 타입배율", () => {
  // 화이트리스트 밖 특성(blaze)으로 순수 타입 상성만 나오게 한다.
  const PLAIN = "blaze"; // 배율 비변경 미지원 특성

  it("불→풀 = 2", () => {
    const clues = judge(attack("fire"), makeSecret(["grass"], PLAIN));
    expect(damageOf(clues).multiplier).toBeCloseTo(2);
  });

  it("불→물 = 0.5", () => {
    const clues = judge(attack("fire"), makeSecret(["water"], PLAIN));
    expect(damageOf(clues).multiplier).toBeCloseTo(0.5);
  });

  it("불→(풀·벌레) = 4", () => {
    const clues = judge(attack("fire"), makeSecret(["grass", "bug"], PLAIN));
    expect(damageOf(clues).multiplier).toBeCloseTo(4);
  });

  it("불→(물·바위) = 0.25", () => {
    const clues = judge(attack("fire"), makeSecret(["water", "rock"], PLAIN));
    expect(damageOf(clues).multiplier).toBeCloseTo(0.25);
  });

  it("thick-fat 정답에 불 = 0.5 (등배 타입 × 0.5 보정)", () => {
    // 방어타입 normal은 fire 등배(1) → thick-fat ×0.5 = 0.5.
    const clues = judge(attack("fire"), makeSecret(["normal"], "thick-fat"));
    expect(damageOf(clues).multiplier).toBeCloseTo(0.5);
  });

  // [P3 보강] thick-fat은 appliesToTypes에 ice도 포함 → 얼음 공격도 ×0.5.
  it("thick-fat 정답에 얼음 = 0.5 (ice도 보정 대상)", () => {
    // normal은 ice 등배(1) → thick-fat ×0.5 = 0.5.
    const clues = judge(attack("ice"), makeSecret(["normal"], "thick-fat"));
    expect(damageOf(clues).multiplier).toBeCloseTo(0.5);
  });

  // [P3 보강] 비표준 곱 합성: 4배약점 × thick-fat 0.5 = 2 (이산집합에 없는 곱).
  it("thick-fat 정답에 4배약점 불 공격 = 2 (4 × 0.5 비표준 합성)", () => {
    // grass+bug는 fire 4배약점 → thick-fat ×0.5 = 2.
    const clues = judge(attack("fire"), makeSecret(["grass", "bug"], "thick-fat"));
    expect(damageOf(clues).multiplier).toBeCloseTo(2);
  });
});

// ───────────────────────────────────────────────────────────────────
// [P2 보강] dry-skin 복합 attack 배열 동작 (유일한 배열 슬롯 — 양 요소 동시 적용)
//   attack 슬롯 = [immuneType(water), multiplier(fire ×1.25)].
//   배열 양 요소가 모두 적용되는 경로를 실증한다.
// ───────────────────────────────────────────────────────────────────
describe("보강 · dry-skin 복합 attack 배열 동작", () => {
  it("dry-skin 정답에 물 공격 = multiplier 0 (immuneType 요소 적용)", () => {
    const clues = judge(attack("water"), makeSecret(["normal"], "dry-skin"));
    expect(damageOf(clues).multiplier).toBe(0);
  });

  it("dry-skin 정답에 불 공격(등배 타입) = multiplier 1.25 (multiplier 요소 적용)", () => {
    // normal은 fire 등배(1) → dry-skin fire ×1.25 = 1.25.
    const clues = judge(attack("fire"), makeSecret(["normal"], "dry-skin"));
    expect(damageOf(clues).multiplier).toBeCloseTo(1.25);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 2: x0 통합 (핵심 — 타입면역 vs 특성면역 구분 불가)
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 2 · x0 통합 (면역 출처 구분 불가)", () => {
  it("타입 면역: 전기→땅 보유 정답 = multiplier 0", () => {
    const clues = judge(attack("electric"), makeSecret(["ground"], "blaze"));
    expect(damageOf(clues).multiplier).toBe(0);
  });

  it("특성 면역: levitate 정답에 땅 공격 = multiplier 0", () => {
    // 방어타입은 ground 무관(normal)로 두어 순수 특성 면역만 작용.
    const clues = judge(attack("ground"), makeSecret(["normal"], "levitate"));
    expect(damageOf(clues).multiplier).toBe(0);
  });

  it("둘 다 동일한 damage(multiplier:0) 단서이고 추가 식별정보가 없다 → 구분 불가", () => {
    const typeImmune = judge(attack("electric"), makeSecret(["ground"], "blaze"));
    const abilityImmune = judge(attack("ground"), makeSecret(["normal"], "levitate"));
    // 둘 다 damage Clue 하나뿐(rank/marker 등 추가 식별정보 없음).
    expect(typeImmune).toEqual([{ kind: "damage", multiplier: 0 }]);
    expect(abilityImmune).toEqual([{ kind: "damage", multiplier: 0 }]);
    // 두 결과의 damage Clue가 완전히 동일.
    expect(damageOf(typeImmune)).toEqual(damageOf(abilityImmune));
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 3: 배율 무효화 특성 (거짓 단서 방지)
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 3 · 배율 무효화 특성", () => {
  it("wonder-guard 정답에 비-효과굉장 공격 = 0", () => {
    // normal 방어타입에 normal 공격 = 등배(1) → 효과굉장 아님 → x0.
    const clues = judge(attack("normal"), makeSecret(["normal"], "wonder-guard"));
    expect(damageOf(clues).multiplier).toBe(0);
  });

  it("wonder-guard 정답에 효과굉장 공격은 통과(x0 아님)", () => {
    // grass 방어에 fire 공격 = 2배(효과굉장) → 통과.
    const clues = judge(attack("fire"), makeSecret(["grass"], "wonder-guard"));
    expect(damageOf(clues).multiplier).toBeCloseTo(2);
  });

  // [P3 보강] 통과는 ×1(원본 배율 보존) 의도 — 4배 약점도 그대로 4로 통과.
  it("wonder-guard 정답에 4배약점 공격 = 4 (통과는 원본 보존, ×1)", () => {
    // fire+ground는 water 4배약점(효과굉장) → wonder-guard 통과(×1) → 4 유지.
    const clues = judge(attack("water"), makeSecret(["fire", "ground"], "wonder-guard"));
    expect(damageOf(clues).multiplier).toBeCloseTo(4);
  });

  it("primordial-sea 정답에 불 공격 = 0", () => {
    const clues = judge(attack("fire"), makeSecret(["normal"], "primordial-sea"));
    expect(damageOf(clues).multiplier).toBe(0);
  });

  it("desolate-land 정답에 물 공격 = 0", () => {
    const clues = judge(attack("water"), makeSecret(["normal"], "desolate-land"));
    expect(damageOf(clues).multiplier).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 4: C3 조건 매칭/미스 (생략 vs 단서)
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 4 · C3 피격랭크 조건 매칭/미스", () => {
  it("weak-armor 정답에 물리 = def-1 & spe+2", () => {
    const clues = judge(attack("normal", "physical"), makeSecret(["normal"], "weak-armor"));
    expect(rankFor(clues, "def")?.delta).toBe(-1);
    expect(rankFor(clues, "spe")?.delta).toBe(2);
  });

  it("weak-armor 정답에 특수 = rank Clue 생략 (damage만)", () => {
    const clues = judge(attack("normal", "special"), makeSecret(["normal"], "weak-armor"));
    expect(ranks(clues)).toHaveLength(0);
    expect(damageOf(clues).multiplier).toBeCloseTo(1);
  });

  it("rattled 정답에 노말 공격 = 생략 (트리거 타입 아님)", () => {
    // rattled 트리거 = dark/ghost/bug. normal은 미스 → rank 없음.
    const clues = judge(attack("normal"), makeSecret(["normal"], "rattled"));
    expect(ranks(clues)).toHaveLength(0);
  });

  it("rattled 정답에 악 공격 = spe+1 (트리거 매칭)", () => {
    const clues = judge(attack("dark"), makeSecret(["normal"], "rattled"));
    expect(rankFor(clues, "spe")?.delta).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 5: 흡수랭크업 vs 순수 x0
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 5 · 흡수랭크업", () => {
  it("lightning-rod(피뢰침) 정답에 전기 = multiplier 0 + rank spa+1 둘 다", () => {
    const clues = judge(attack("electric"), makeSecret(["normal"], "lightning-rod"));
    expect(damageOf(clues).multiplier).toBe(0);
    expect(rankFor(clues, "spa")?.delta).toBe(1);
  });

  it("water-absorb(저수) 정답에 물 = multiplier 0 만 (rank 없음)", () => {
    const clues = judge(attack("water"), makeSecret(["normal"], "water-absorb"));
    expect(damageOf(clues).multiplier).toBe(0);
    expect(ranks(clues)).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 6: 등장 트랙
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 6 · 등장 트랙 (entryClues)", () => {
  it("drought = entry weather:'sun'", () => {
    const clues = entryClues(makeSecret(["normal"], "drought"));
    const e = entriesOf(clues);
    expect(e).toHaveLength(1);
    expect(e[0].effect).toEqual({ kind: "weather", weather: "sun" });
  });

  it("grassy-surge = entry terrain:'grassy'", () => {
    const clues = entryClues(makeSecret(["normal"], "grassy-surge"));
    const e = entriesOf(clues);
    expect(e).toHaveLength(1);
    expect(e[0].effect).toEqual({ kind: "terrain", terrain: "grassy" });
  });

  it("intrepid-sword = rank target:'secret' atk+1", () => {
    const clues = entryClues(makeSecret(["normal"], "intrepid-sword"));
    const r = rankFor(clues, "atk");
    expect(r).toBeDefined();
    expect(r?.target).toBe("secret");
    expect(r?.delta).toBe(1);
  });

  it("intimidate = marker:'intimidate'", () => {
    const clues = entryClues(makeSecret(["normal"], "intimidate"));
    expect(markers(clues).map((m) => m.marker)).toEqual(["intimidate"]);
  });

  it("등장 슬롯 없는 특성 = 빈 배열", () => {
    expect(entryClues(makeSecret(["normal"], "blaze"))).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 7: 상태이상기 트랙
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 7 · 상태이상기 트랙", () => {
  it("'paralysis'에 limber = status immune", () => {
    const clues = judge(status("paralysis"), makeSecret(["normal"], "limber"));
    expect(statusOf(clues)).toEqual({ kind: "status", status: "paralysis", result: "immune" });
  });

  it("'burn'에 water-veil = immune", () => {
    const clues = judge(status("burn"), makeSecret(["normal"], "water-veil"));
    expect(statusOf(clues)?.result).toBe("immune");
  });

  it("'paralysis'에 synchronize = marker:'status-reflect'", () => {
    const clues = judge(status("paralysis"), makeSecret(["normal"], "synchronize"));
    expect(markers(clues).map((m) => m.marker)).toEqual(["status-reflect"]);
    // 반사는 status result variant가 아니라 marker로만 일원화 → status Clue 없음.
    expect(statusOf(clues)).toBeUndefined();
  });

  it("화이트리스트 밖 = status applied", () => {
    const clues = judge(status("burn"), makeSecret(["normal"], "blaze"));
    expect(statusOf(clues)).toEqual({ kind: "status", status: "burn", result: "applied" });
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 8: 랭크변화기 트랙 (적용 순서 차단>반전>반응 실증)
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 8 · 랭크변화기 트랙", () => {
  it("stat{def,-1}에 clear-body = rank delta 0 (차단)", () => {
    const clues = judge(stat("def", -1), makeSecret(["normal"], "clear-body"));
    expect(rankFor(clues, "def")?.delta).toBe(0);
  });

  it("stat{def,-1}에 defiant = atk+2 (반응) + def 정상 적용", () => {
    const clues = judge(stat("def", -1), makeSecret(["normal"], "defiant"));
    expect(rankFor(clues, "def")?.delta).toBe(-1); // 정상 적용
    expect(rankFor(clues, "atk")?.delta).toBe(2); // 반응
  });

  it("stat{def,-1}에 contrary = def+1 (반전)", () => {
    const clues = judge(stat("def", -1), makeSecret(["normal"], "contrary"));
    expect(rankFor(clues, "def")?.delta).toBe(1);
  });

  it("stat{def,-1}에 mirror-armor = marker:'stat-reflect'", () => {
    const clues = judge(stat("def", -1), makeSecret(["normal"], "mirror-armor"));
    expect(markers(clues).map((m) => m.marker)).toEqual(["stat-reflect"]);
    expect(ranks(clues)).toHaveLength(0);
  });

  it("stat{def,-1}에 guard-dog = delta 0(차단) + atk+1(반응) 둘 다 (차단>반응)", () => {
    const clues = judge(stat("def", -1), makeSecret(["normal"], "guard-dog"));
    expect(rankFor(clues, "def")?.delta).toBe(0); // 차단 먼저
    expect(rankFor(clues, "atk")?.delta).toBe(1); // 반응 동반
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 9: C5 비관측 경계
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 9 · C5 비관측 경계", () => {
  it("guts 정답에 'burn' → status applied 이되 '공격강화'류 Clue 없음", () => {
    // guts는 화이트리스트 밖(C5 성격, v1 비관측) → 상태는 정상 applied, 부가 단서 0.
    const clues = judge(status("burn"), makeSecret(["normal"], "guts"));
    expect(statusOf(clues)).toEqual({ kind: "status", status: "burn", result: "applied" });
    // rank(공격 강화)·marker 등 관측 단서가 전혀 없다.
    expect(ranks(clues)).toHaveLength(0);
    expect(markers(clues)).toHaveLength(0);
    expect(clues).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 10: 안전 폴백 (배율 비변경 미지원 특성)
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 10 · 안전 폴백", () => {
  it("화이트리스트 밖 특성 공격 = 거짓 단서 없이 타입 상성만", () => {
    // blaze는 배율 비변경 미지원 특성 → 순수 타입 상성(불→물=0.5)만, damage 1개.
    const clues = judge(attack("fire"), makeSecret(["water"], "blaze"));
    expect(clues).toEqual([{ kind: "damage", multiplier: 0.5 }]);
  });

  it("화이트리스트 밖 특성 상태기 = 정상 applied", () => {
    const clues = judge(status("paralysis"), makeSecret(["normal"], "no-such-ability"));
    expect(statusOf(clues)).toEqual({ kind: "status", status: "paralysis", result: "applied" });
  });

  it("화이트리스트 밖 특성 랭크기 = 정상 적용 (delta 입력 그대로)", () => {
    const clues = judge(stat("def", -1), makeSecret(["normal"], "no-such-ability"));
    expect(ranks(clues)).toHaveLength(1);
    expect(rankFor(clues, "def")?.delta).toBe(-1);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 11: 순수성
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 11 · 순수성·결정론", () => {
  it("동일 입력 반복 호출이 toEqual 동일 (judge)", () => {
    const action = attack("fire", "physical");
    const secret = makeSecret(["grass", "bug"], "weak-armor");
    const a = judge(action, secret);
    const b = judge(action, secret);
    expect(a).toEqual(b);
  });

  it("동일 입력 반복 호출이 toEqual 동일 (entryClues)", () => {
    const secret = makeSecret(["normal"], "drought");
    expect(entryClues(secret)).toEqual(entryClues(secret));
  });

  it("반환 배열 변형이 다음 호출에 영향 없음", () => {
    const action = attack("electric");
    const secret = makeSecret(["normal"], "lightning-rod");
    const first = judge(action, secret) as Clue[];
    const lenBefore = first.length;
    // 반환 배열을 변형(소비처 오염 시뮬레이션).
    first.push({ kind: "marker", marker: "intimidate" });
    first.length = 0;
    // 다음 호출은 변형에 영향받지 않아야 한다.
    const second = judge(action, secret);
    expect(second).toHaveLength(lenBefore);
    expect(damageOf(second).multiplier).toBe(0);
    expect(rankFor(second, "spa")?.delta).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────
// ADR 검증 항목 12: 미지원 특성 안전 폴백 (전 트랙 sanity)
//   ADR "안전 폴백" 항목의 전 트랙 망라. (확장성 ②=시그니처/오케스트레이터
//   불변은 정적 구조 검증 영역이라 동작 테스트 밖 — abilities.test.ts·타입계가 커버.)
// ───────────────────────────────────────────────────────────────────
describe("ADR검증 12 · 미지원 특성 안전 폴백 (전 트랙)", () => {
  it("미지원 특성은 거짓 단서 없이 기본 판정만(공격/상태/랭크 전 트랙)", () => {
    const UNSUPPORTED = "some-future-ability";
    // 공격: 순수 타입 상성만.
    expect(judge(attack("fire"), makeSecret(["grass"], UNSUPPORTED))).toEqual([
      { kind: "damage", multiplier: 2 },
    ]);
    // 상태: applied.
    expect(statusOf(judge(status("sleep"), makeSecret(["normal"], UNSUPPORTED)))?.result).toBe("applied");
    // 랭크: 정상 적용.
    expect(rankFor(judge(stat("atk", -2), makeSecret(["normal"], UNSUPPORTED)), "atk")?.delta).toBe(-2);
    // 등장: 빈 배열.
    expect(entryClues(makeSecret(["normal"], UNSUPPORTED))).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────
// [P2 보강] ADR 검증: 의존 방향 단방향(src/data만) · 런타임 외부 fetch 0
//   engine 비-test 소스를 빌드타임(import.meta.glob ?raw)으로 문자열 수집해
//   정적 단언한다. (node:fs 미사용 — app tsconfig(types:["vite/client"]) 정합.)
// ───────────────────────────────────────────────────────────────────
describe("보강 · 의존 방향 · 외부 의존 0 (정적 소스 검사)", () => {
  // 이 테스트 파일 기준 상대 glob. 키 형태: "./index.ts", "./tracks/attack.ts" 등.
  const rawModules = import.meta.glob("./**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  // 비-test, 비-fixture 소스만. (이 파일 자신도 .test.ts라 자동 제외.)
  const sourceEntries = Object.entries(rawModules).filter(
    ([key]) => !key.endsWith(".test.ts") && !key.includes("/__fixtures__/"),
  );

  /** from "..." / import("...") 의 모든 모듈 specifier 추출. */
  function importSpecifiers(code: string): string[] {
    const specs: string[] = [];
    const re = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) specs.push(m[1]);
    return specs;
  }

  /** posix 경로 세그먼트 정규화(. / .. 해소). 디렉터리 경로 입력. */
  function normalizeDir(segments: string[]): string[] {
    const out: string[] = [];
    for (const seg of segments) {
      if (seg === "" || seg === ".") continue;
      if (seg === "..") out.pop();
      else out.push(seg);
    }
    return out;
  }

  /**
   * glob 키(파일, engine 루트 기준 "./x.ts")의 디렉터리에 specifier를 합성해
   * "src 루트 기준 정규화 경로"를 만든다. engine 루트는 src/engine 로 본다.
   */
  function resolveFromEngine(fileKey: string, spec: string): string[] {
    // fileKey: "./tracks/attack.ts" → 디렉터리 세그먼트 ["src","engine","tracks"].
    const fileDir = fileKey.replace(/^\.\//, "").split("/").slice(0, -1);
    const base = ["src", "engine", ...fileDir];
    return normalizeDir([...base, ...spec.split("/")]);
  }

  it("engine 소스 파일이 1개 이상 수집된다 (검사 대상 존재 보장)", () => {
    expect(sourceEntries.length).toBeGreaterThan(0);
  });

  it("상대 import는 engine 내부이거나 src/data 모듈로만 한정 (data→engine 단방향)", () => {
    for (const [key, code] of sourceEntries) {
      for (const spec of importSpecifiers(code)) {
        if (!spec.startsWith(".")) continue; // 패키지(vitest 등)는 검사 밖.
        const resolved = resolveFromEngine(key, spec); // src 루트 기준 세그먼트.
        const inEngine = resolved[0] === "src" && resolved[1] === "engine";
        const inData = resolved[0] === "src" && resolved[1] === "data";
        expect(inEngine || inData, `${key} 가 engine/data 밖 모듈을 참조: ${spec} → ${resolved.join("/")}`).toBe(
          true,
        );
      }
    }
  });

  it("런타임 외부/동적 의존이 없다 (fetch( / import( / globalThis / window)", () => {
    for (const [key, code] of sourceEntries) {
      expect(/\bfetch\s*\(/.test(code), `${key} 에 fetch( 존재`).toBe(false);
      // 동적 import() 호출만 차단(정적/type-only import 문은 '(' 없으니 통과).
      expect(/\bimport\s*\(/.test(code), `${key} 에 동적 import( 존재`).toBe(false);
      expect(/\bglobalThis\b/.test(code), `${key} 에 globalThis 존재`).toBe(false);
      expect(/\bwindow\b/.test(code), `${key} 에 window 존재`).toBe(false);
    }
  });
});
