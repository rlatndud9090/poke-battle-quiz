// 포켓몬 데이터 계약 — 타입 정의
// 데이터 산출물(pokemon.json / typechart.json / meta.json)이 이 타입을 만족한다.
// 상세 결정 근거는 docs/raw/feature/pokemon-data-contract/{prd,adr}.md 참조.

/** 18개 배틀 타입 (PokéAPI의 stellar/unknown 등 비배틀 타입은 제외) */
export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

/** 타입 상성 배수: 무효 0 / 반감 0.5 / 등배 1 / 효과적 2 */
export type Multiplier = 0 | 0.5 | 1 | 2;

/**
 * 타입 상성표. `typeChart[attacker][defender]` = 단일 타입 기준 배수.
 * 복합 타입 방어는 각 방어 타입 배수의 곱으로 계산한다(헬퍼 getEffectiveness).
 */
export type TypeChart = Record<PokemonType, Record<PokemonType, Multiplier>>;

/** 정답 후보의 폼 분류 (네비게이션·필터용 라벨, 정답 판정용 아님) */
export type FormCategory = "base" | "mega" | "primal" | "regional" | "other";

/** 특성: 식별자(slug)와 숨은특성 여부만. 효과 메타데이터는 battle-judgment-engine 소관. */
export interface Ability {
  /** PokéAPI ability slug (예: "blaze", "tough-claws") */
  id: string;
  /** 숨은특성 여부 */
  hidden: boolean;
}

/**
 * 정답 후보 1건. 원종 또는 타입/특성이 원종과 다른 폼(지역폼·메가·원시회귀).
 * 식별 단위는 (species, form) 복합 — id가 폼 고유 키다.
 */
export interface Candidate {
  /** 폼 고유 식별자 = PokéAPI pokemon name (예: "charizard", "charizard-mega-x", "vulpix-alola") */
  id: string;
  /** 원종 도감번호 (폼도 원종 번호를 공유) */
  speciesId: number;
  /** 원종 slug (예: "charizard") — 같은 종 폼 그룹핑 키 */
  speciesName: string;
  /** 원종(is_default) 여부 */
  isDefault: boolean;
  /** 폼 분류 */
  formCategory: FormCategory;
  /** 타입 1~2개 (슬롯 순서) */
  types: PokemonType[];
  /** 가능 특성 1개 이상 (일반 + 숨은) */
  abilities: Ability[];
  /** 도입 세대 1~9 */
  generation: number;
  /** 한국어 이름 (폼은 합성) */
  nameKo: string;
  /** 영어 이름 */
  nameEn: string;
}

/** 데이터 산출물 메타데이터 — 출처·스냅샷·모수·제외 내역을 기록해 재현성/검증을 보장한다. */
export interface DataMeta {
  /** 1차 소스 레포 */
  source: string;
  /** 고정 참조한 커밋 SHA (결정론 전제) */
  sha: string;
  /** 생성 시각 (ISO) — 스크립트가 채움 */
  generatedAt: string;
  /** 정답 후보 총수 */
  totalCandidates: number;
  /** 원종 수 (블랙리스트 제외 후) */
  baseSpeciesCount: number;
  /** 포함된 폼 수 */
  formCount: number;
  /** 종 자체를 제외한 블랙리스트 (예: arceus, silvally) */
  blacklistedSpecies: string[];
  /** 타입/특성이 원종과 동일해 제외한 폼 수 (gmax·외형 변형 등) */
  excludedIdenticalForms: number;
  /** ko 이름이 비어 en으로 폴백한 항목 id 목록 */
  koFallbacks: string[];
}

/** 산출물 전체 묶음 (pokemon.json은 Candidate[], typechart.json은 TypeChart, meta.json은 DataMeta) */
export interface PokemonDataset {
  candidates: Candidate[];
  typeChart: TypeChart;
  meta: DataMeta;
}
