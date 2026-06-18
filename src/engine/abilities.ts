// 배틀 판정 엔진 — v1 특성 화이트리스트 데이터
//
// 권위 출처:
//  - 트랙 분류·효과 파라미터: 구현 청사진 `notes.md` 3절 (3-A~3-H) + 작업 확정 판단.
//  - nameKo: 고정 SHA api-data ko명 권위 맵 (오타 방지를 위해 맵 값을 그대로 옮김).
//
// ADR (5)·(6) 정책:
//  - C1 흡수랭크업 5종(sap-sipper/lightning-rod/storm-drain/motor-drive/well-baked-body)은 x0 + rank.
//  - 저수·축전·타오르는불꽃·부유·흙먹기는 순수 x0(부수효과 v1 비관측).
//  - 다중 트랙 특성(dry-skin/purifying-salt/thermal-exchange/water-bubble/desolate-land/primordial-sea)은
//    여러 슬롯을 채운다. attack 슬롯은 복합 시 배열.
//  - C3 피격랭크 7종은 확정 판단(#1 해소)으로 포함. 상대대상·접촉·StatId 밖 효과는 제외.

import type { AbilityRecord } from "./types";

/** 슬러그 → 화이트리스트 레코드. v1 단서에 등장하는 특성의 부분집합(약 60종). */
export const ABILITY_WHITELIST: Readonly<Record<string, AbilityRecord>> = {
  // ── 3-A. 공격 트랙 — C1 타입면역 (11종, wind-rider 제외) ──
  levitate: { slug: "levitate", nameKo: "부유", attack: { kind: "immuneType", immuneTo: "ground" } },
  "water-absorb": { slug: "water-absorb", nameKo: "저수", attack: { kind: "immuneType", immuneTo: "water" } },
  "volt-absorb": { slug: "volt-absorb", nameKo: "축전", attack: { kind: "immuneType", immuneTo: "electric" } },
  "flash-fire": { slug: "flash-fire", nameKo: "타오르는불꽃", attack: { kind: "immuneType", immuneTo: "fire" } },
  "earth-eater": { slug: "earth-eater", nameKo: "흙먹기", attack: { kind: "immuneType", immuneTo: "ground" } },
  // dry-skin: 물 면역(C1) + 불 ×1.25(C2) 복합 — 배열 슬롯.
  "dry-skin": {
    slug: "dry-skin",
    nameKo: "건조피부",
    attack: [
      { kind: "immuneType", immuneTo: "water" },
      { kind: "multiplier", appliesToTypes: ["fire"], factor: 1.25 },
    ],
  },
  // 흡수랭크업 5종 (x0 + rank)
  "sap-sipper": {
    slug: "sap-sipper",
    nameKo: "초식",
    attack: { kind: "absorbBoost", immuneTo: "grass", stat: "atk", delta: 1 },
  },
  "lightning-rod": {
    slug: "lightning-rod",
    nameKo: "피뢰침",
    attack: { kind: "absorbBoost", immuneTo: "electric", stat: "spa", delta: 1 },
  },
  "storm-drain": {
    slug: "storm-drain",
    nameKo: "마중물",
    attack: { kind: "absorbBoost", immuneTo: "water", stat: "spa", delta: 1 },
  },
  "motor-drive": {
    slug: "motor-drive",
    nameKo: "전기엔진",
    attack: { kind: "absorbBoost", immuneTo: "electric", stat: "spe", delta: 1 },
  },
  "well-baked-body": {
    slug: "well-baked-body",
    nameKo: "노릇노릇바디",
    attack: { kind: "absorbBoost", immuneTo: "fire", stat: "def", delta: 2 },
  },

  // ── 3-B. 공격 트랙 — C2 배율보정 (선언적 multiplier) ──
  "thick-fat": {
    slug: "thick-fat",
    nameKo: "두꺼운지방",
    attack: { kind: "multiplier", appliesToTypes: ["fire", "ice"], factor: 0.5 },
  },
  heatproof: {
    slug: "heatproof",
    nameKo: "내열",
    attack: { kind: "multiplier", appliesToTypes: ["fire"], factor: 0.5 },
  },
  // purifying-salt: 고스트 ×0.5(C2) + 전상태 면역(C3-E) 다중 트랙.
  "purifying-salt": {
    slug: "purifying-salt",
    nameKo: "정화의소금",
    attack: { kind: "multiplier", appliesToTypes: ["ghost"], factor: 0.5 },
    status: { kind: "immuneAll" },
  },
  // water-bubble: 불 ×0.5(방어측 C2) + 화상 면역(C3-E) 다중 트랙. (물 2x는 공격측 C5라 v1 제외)
  "water-bubble": {
    slug: "water-bubble",
    nameKo: "수포",
    attack: { kind: "multiplier", appliesToTypes: ["fire"], factor: 0.5 },
    status: { kind: "immune", blocks: ["burn"] },
  },

  // ── 3-C. 공격 트랙 — C2 계산의존 (명명 술어 predicate) ──
  filter: { slug: "filter", nameKo: "필터", attack: { kind: "predicate", predicate: "filter" } },
  "solid-rock": { slug: "solid-rock", nameKo: "하드록", attack: { kind: "predicate", predicate: "filter" } },
  "prism-armor": { slug: "prism-armor", nameKo: "프리즘아머", attack: { kind: "predicate", predicate: "filter" } },
  multiscale: { slug: "multiscale", nameKo: "멀티스케일", attack: { kind: "predicate", predicate: "multiscale" } },
  "shadow-shield": {
    slug: "shadow-shield",
    nameKo: "스펙터가드",
    attack: { kind: "predicate", predicate: "multiscale" },
  },
  "ice-scales": { slug: "ice-scales", nameKo: "얼음인분", attack: { kind: "predicate", predicate: "iceScales" } },
  "fur-coat": { slug: "fur-coat", nameKo: "퍼코트", attack: { kind: "predicate", predicate: "furCoat" } },
  "wonder-guard": {
    slug: "wonder-guard",
    nameKo: "불가사의부적",
    attack: { kind: "predicate", predicate: "wonderGuard" },
  },
  // desolate-land: 물 공격 x0(술어) + 강한햇살 설치(등장) 다중 트랙.
  "desolate-land": {
    slug: "desolate-land",
    nameKo: "끝의대지",
    attack: { kind: "predicate", predicate: "desolateLand" },
    entry: { kind: "setWeather", weather: "harsh-sun" },
  },
  // primordial-sea: 불 공격 x0(술어) + 강한비 설치(등장) 다중 트랙.
  "primordial-sea": {
    slug: "primordial-sea",
    nameKo: "시작의바다",
    attack: { kind: "predicate", predicate: "primordialSea" },
    entry: { kind: "setWeather", weather: "heavy-rain" },
  },

  // ── 3-D. 등장 트랙 — C7 설치 + C4 ──
  drought: { slug: "drought", nameKo: "가뭄", entry: { kind: "setWeather", weather: "sun" } },
  "orichalcum-pulse": {
    slug: "orichalcum-pulse",
    nameKo: "진홍빛고동",
    entry: { kind: "setWeather", weather: "sun" },
  },
  drizzle: { slug: "drizzle", nameKo: "잔비", entry: { kind: "setWeather", weather: "rain" } },
  "sand-stream": { slug: "sand-stream", nameKo: "모래날림", entry: { kind: "setWeather", weather: "sandstorm" } },
  "snow-warning": { slug: "snow-warning", nameKo: "눈퍼뜨리기", entry: { kind: "setWeather", weather: "snow" } },
  "grassy-surge": { slug: "grassy-surge", nameKo: "그래스메이커", entry: { kind: "setTerrain", terrain: "grassy" } },
  "electric-surge": {
    slug: "electric-surge",
    nameKo: "일렉트릭메이커",
    entry: { kind: "setTerrain", terrain: "electric" },
  },
  "psychic-surge": {
    slug: "psychic-surge",
    nameKo: "사이코메이커",
    entry: { kind: "setTerrain", terrain: "psychic" },
  },
  "misty-surge": { slug: "misty-surge", nameKo: "미스트메이커", entry: { kind: "setTerrain", terrain: "misty" } },
  "hadron-engine": {
    slug: "hadron-engine",
    nameKo: "하드론엔진",
    entry: { kind: "setTerrain", terrain: "electric" },
  },
  intimidate: { slug: "intimidate", nameKo: "위협", entry: { kind: "marker", marker: "intimidate" } },
  "intrepid-sword": {
    slug: "intrepid-sword",
    nameKo: "불요의검",
    entry: { kind: "selfBoost", stat: "atk", delta: 1 },
  },
  "dauntless-shield": {
    slug: "dauntless-shield",
    nameKo: "불굴의방패",
    entry: { kind: "selfBoost", stat: "def", delta: 1 },
  },
  // as-one-glastrier/spectrier 제외: As One = 긴장감(Unnerve, 나무열매 봉인=비관측)
  //   + 백의울음/사신의말(기절 시 자기 공격/특공↑ = C5 ATK 발동). **위협(Intimidate)이 아님.**
  //   v1 관측 가능 효과가 없어 화이트리스트에서 제외(안전 폴백 = undefined).

  // ── 3-E. 상태기 트랙 — 보강2 상태면역/반사 ──
  limber: { slug: "limber", nameKo: "유연", status: { kind: "immune", blocks: ["paralysis"] } },
  "water-veil": { slug: "water-veil", nameKo: "수의베일", status: { kind: "immune", blocks: ["burn"] } },
  // thermal-exchange: 화상 면역(C3-E) + 불 피격 atk+1(C3-G) 다중 트랙.
  "thermal-exchange": {
    slug: "thermal-exchange",
    nameKo: "열교환",
    status: { kind: "immune", blocks: ["burn"] },
    attack: { kind: "hitReaction", trigger: { kind: "types", types: ["fire"] }, boosts: [{ stat: "atk", delta: 1 }] },
  },
  "own-tempo": { slug: "own-tempo", nameKo: "마이페이스", status: { kind: "immune", blocks: ["confusion"] } },
  insomnia: { slug: "insomnia", nameKo: "불면", status: { kind: "immune", blocks: ["sleep"] } },
  "vital-spirit": { slug: "vital-spirit", nameKo: "의기양양", status: { kind: "immune", blocks: ["sleep"] } },
  "sweet-veil": { slug: "sweet-veil", nameKo: "스위트베일", status: { kind: "immune", blocks: ["sleep"] } },
  immunity: { slug: "immunity", nameKo: "면역", status: { kind: "immune", blocks: ["poison"] } },
  "pastel-veil": { slug: "pastel-veil", nameKo: "파스텔베일", status: { kind: "immune", blocks: ["poison"] } },
  comatose: { slug: "comatose", nameKo: "절대안깸", status: { kind: "immuneAll" } },
  // synchronize: burn/paralysis/poison 반사(showdown: sleep/confusion 제외) → marker('status-reflect').
  synchronize: {
    slug: "synchronize",
    nameKo: "싱크로",
    status: { kind: "reflect", reflects: ["burn", "paralysis", "poison"] },
  },

  // ── 3-F. 랭크기 트랙 — 보강3 랭크반응 (11종, accuracy 차단 3종 제외) ──
  "clear-body": { slug: "clear-body", nameKo: "클리어바디", stat: { kind: "block" } },
  "white-smoke": { slug: "white-smoke", nameKo: "하얀연기", stat: { kind: "block" } },
  "full-metal-body": { slug: "full-metal-body", nameKo: "메탈프로텍트", stat: { kind: "block" } },
  "big-pecks": { slug: "big-pecks", nameKo: "부풀린가슴", stat: { kind: "block", stats: ["def"] } },
  "hyper-cutter": { slug: "hyper-cutter", nameKo: "괴력집게", stat: { kind: "block", stats: ["atk"] } },
  defiant: { slug: "defiant", nameKo: "오기", stat: { kind: "react", on: "anyDrop", stat: "atk", delta: 2 } },
  competitive: {
    slug: "competitive",
    nameKo: "승기",
    stat: { kind: "react", on: "anyDrop", stat: "spa", delta: 2 },
  },
  contrary: { slug: "contrary", nameKo: "심술꾸러기", stat: { kind: "invert" } },
  simple: { slug: "simple", nameKo: "단순", stat: { kind: "amplify", factor: 2 } },
  "guard-dog": { slug: "guard-dog", nameKo: "파수견", stat: { kind: "blockAndReact", stat: "atk", delta: 1 } },
  "mirror-armor": { slug: "mirror-armor", nameKo: "미러아머", stat: { kind: "reflect" } },

  // ── 3-G. 공격 트랙 — C3 피격랭크 (타입/분류 조건부, 7종) ──
  "weak-armor": {
    slug: "weak-armor",
    nameKo: "깨어진갑옷",
    attack: {
      kind: "hitReaction",
      trigger: { kind: "category", category: "physical" },
      boosts: [
        { stat: "def", delta: -1 },
        { stat: "spe", delta: 2 },
      ],
    },
  },
  rattled: {
    slug: "rattled",
    nameKo: "주눅",
    attack: {
      kind: "hitReaction",
      trigger: { kind: "types", types: ["dark", "ghost", "bug"] },
      boosts: [{ stat: "spe", delta: 1 }],
    },
  },
  justified: {
    slug: "justified",
    nameKo: "정의의마음",
    attack: {
      kind: "hitReaction",
      trigger: { kind: "types", types: ["dark"] },
      boosts: [{ stat: "atk", delta: 1 }],
    },
  },
  "water-compaction": {
    slug: "water-compaction",
    nameKo: "꾸덕꾸덕굳기",
    attack: {
      kind: "hitReaction",
      trigger: { kind: "types", types: ["water"] },
      boosts: [{ stat: "def", delta: 2 }],
    },
  },
  "steam-engine": {
    slug: "steam-engine",
    nameKo: "증기기관",
    attack: {
      kind: "hitReaction",
      trigger: { kind: "types", types: ["fire", "water"] },
      boosts: [{ stat: "spe", delta: 6 }],
    },
  },
  // thermal-exchange는 위 3-E에서 status+attack 다중 트랙으로 이미 정의됨.
  stamina: {
    slug: "stamina",
    nameKo: "지구력",
    attack: {
      kind: "hitReaction",
      trigger: { kind: "always" },
      boosts: [{ stat: "def", delta: 1 }],
    },
  },
};

/** 슬러그로 화이트리스트 레코드 조회. 미지원이면 undefined(안전 폴백). */
export function getAbilityRecord(slug: string): AbilityRecord | undefined {
  return ABILITY_WHITELIST[slug];
}
