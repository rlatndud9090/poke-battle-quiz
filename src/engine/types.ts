// 배틀 판정 엔진 — 공개 계약 타입 + 화이트리스트 레코드 타입
//
// 권위 출처:
//  - ADR `docs/raw/feature/battle-judgment-engine/adr.md` 결정(1): Action/Clue/Secret/시그니처 (변경 불가).
//  - 구현 청사진 `notes.md` `## 구현 계획` 2절: 레코드 타입 스켈레톤 (신규 설계, 변경 자유).
//
// 의존 방향: src/data → src/engine 단방향. data에서 type-only import만 한다.

import type { Ability, Candidate, PokemonType } from "../data/types";

// ── 신규 리터럴 (데이터 계약에 없어 엔진이 정의) ──
export type StatId = "atk" | "def" | "spa" | "spd" | "spe";
export type StatusId = "burn" | "paralysis" | "confusion" | "poison" | "sleep";
export type WeatherId = "sun" | "rain" | "sandstorm" | "snow" | "harsh-sun" | "heavy-rain";
export type TerrainId = "grassy" | "electric" | "psychic" | "misty";

/** 정밀 곱 별칭 (데이터 계약 Multiplier(0|0.5|1|2)와 별개 — 타입 곱 × 특성 보정 곱). */
export type DamageMultiplier = number;

export type EntryEffect =
  | { kind: "weather"; weather: WeatherId }
  | { kind: "terrain"; terrain: TerrainId };
// 등장 시 정답 자신 스탯 상승(intrepid-sword 등)은 Clue.rank{target:'secret'}로 일원화.

// ── 입력 (판별 유니온, 공통 판별자 kind) ──
export type Action =
  | { kind: "attack"; attackType: PokemonType; category: "physical" | "special" }
  | { kind: "status"; status: StatusId }
  | { kind: "stat"; stat: StatId; stages: number };

/** 정답 후보 + 그 후보의 가능 특성 중 선택된 1개. */
export interface Secret {
  candidate: Candidate;
  ability: Ability;
}

// ── 출력 (판별 유니온, 공통 판별자 kind) ──
export type Clue =
  | { kind: "damage"; multiplier: DamageMultiplier }
  | { kind: "rank"; target: "secret"; stat: StatId; delta: number }
  | { kind: "status"; status: StatusId; result: "applied" | "immune" }
  | { kind: "entry"; effect: EntryEffect }
  | { kind: "marker"; marker: "intimidate" | "status-reflect" | "stat-reflect" };
// C5 seam(후속): | { kind: 'offense'; powerMod?: number; typeOverride?: PokemonType; ignoresDefensiveAbility?: boolean }

// ── 화이트리스트 레코드 타입 (신규 설계, ADR (3)·(6) 구체화) ──
// 한 특성이 여러 트랙에 걸칠 수 있어(thermal-exchange = 상태기 화상면역 + 공격 피격랭크) 슬롯은 전부 optional.
// 각 트랙 해석기는 자기 슬롯만 읽는다.

/** (A) 공격 트랙 효과. dry-skin/water-bubble처럼 복합 특성은 배열로 둔다. */
export type AttackEffect =
  // C1 순수 타입면역 (x0, 부수효과 없음)
  | { kind: "immuneType"; immuneTo: PokemonType }
  // C1 흡수 + 자신 랭크업 (x0 + rank)
  | { kind: "absorbBoost"; immuneTo: PokemonType; stat: StatId; delta: number }
  // C2 선언적 배율보정 (타입/분류 조건 만족 시 multiplier ×= factor)
  | { kind: "multiplier"; appliesToTypes?: PokemonType[]; category?: "physical" | "special"; factor: number }
  // C3 피격 시 자신 랭크변화 (타입/분류 조건부, 미스 시 생략)
  | { kind: "hitReaction"; trigger: HitTrigger; boosts: ReadonlyArray<{ stat: StatId; delta: number }> }
  // C1/C2 계산의존 → predicates.ts 위임
  | { kind: "predicate"; predicate: AttackPredicateName };

/** C3 피격랭크 트리거 조건. */
export type HitTrigger =
  | { kind: "always" } // 무조건 피격 (stamina)
  | { kind: "category"; category: "physical" | "special" } // 물리/특수 피격 (weak-armor)
  | { kind: "types"; types: PokemonType[] }; // 특정 타입 피격 (rattled/justified/...)

export type AttackPredicateName =
  | "filter" // 효과굉장이면 ×0.75 (filter/solid-rock/prism-armor)
  | "multiscale" // (풀피 가정) ×0.5 (multiscale/shadow-shield)
  | "iceScales" // 특수기 ×0.5
  | "furCoat" // 물리기 ×0.5
  | "wonderGuard" // 효과굉장 아니면 x0
  | "desolateLand" // 물 공격 x0
  | "primordialSea"; // 불 공격 x0

/** (B) 등장 트랙 효과. */
export type EntryAbilityEffect =
  | { kind: "setWeather"; weather: WeatherId }
  | { kind: "setTerrain"; terrain: TerrainId }
  | { kind: "selfBoost"; stat: StatId; delta: number } // → Clue.rank{target:'secret'}
  | { kind: "marker"; marker: "intimidate" };

/** (C) 상태기 트랙 효과. */
export type StatusAbilityEffect =
  | { kind: "immune"; blocks: StatusId[] } // blocks에 포함된 status는 immune
  | { kind: "immuneAll" } // 모든 v1 StatusId immune (purifying-salt/comatose)
  | { kind: "reflect"; reflects: StatusId[] }; // synchronize: 반사 → marker('status-reflect')

/** (D) 랭크기 트랙 효과. */
export type StatAbilityEffect =
  | { kind: "block"; stats?: StatId[] } // stats 미지정=전스탯하락 차단. 지정=해당 스탯만
  | { kind: "invert" } // contrary: 부호 반전
  | { kind: "amplify"; factor: number } // simple: ×2
  | { kind: "react"; on: "anyDrop"; stat: StatId; delta: number } // defiant/competitive
  | { kind: "reflect" } // mirror-armor → marker('stat-reflect')
  | { kind: "blockAndReact"; stat: StatId; delta: number }; // guard-dog: 차단+반응

/**
 * v1 화이트리스트 레코드. 슬러그 1개당 1레코드, 채워진 슬롯이 해당 특성이 관여하는 트랙.
 * attack 슬롯은 복합 특성(dry-skin=물면역+불1.25 등)을 위해 단일/배열 모두 허용.
 */
export interface AbilityRecord {
  slug: string;
  nameKo: string; // 권위 ko명 맵에서
  attack?: AttackEffect | AttackEffect[]; // (A) 공격 트랙
  entry?: EntryAbilityEffect; // (B) 등장 트랙
  status?: StatusAbilityEffect; // (C) 상태기 트랙
  stat?: StatAbilityEffect; // (D) 랭크기 트랙
}

// ── 공개 시그니처 ──
export type Judge = (action: Readonly<Action>, secret: Readonly<Secret>) => readonly Clue[];
export type EntryClues = (secret: Readonly<Secret>) => readonly Clue[];

/** 판별 유니온 망라 검증 — 누락을 컴파일 타임에 잡는다. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected variant: ${JSON.stringify(value)}`);
}
