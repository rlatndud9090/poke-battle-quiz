// 배틀 판정 엔진 — 명명 술어 (ADR (3) escape hatch)
//
// 계산 의존 배율 보정/면역을 격리한다. 순수 함수이며 입력은
// "공격 action + attack 해석기가 이미 계산한 순수 타입 배율(typeMultiplier)"만 받는다.
// 출력은 "곱할 인자"(0이면 무효, 1이면 영향 없음).
//
// 청사진 4절 단순화 정책:
//  - multiscale/shadow-shield: judge에 HP 맥락이 없어 "정답 항상 풀피 가정" → 항상 ×0.5.
//  - filter/wonderGuard: 효과굉장 여부는 typeMultiplier(getEffectiveness 결과)로 judge 시점에 정확 계산.
//  - desolateLand/primordialSea: 특정 타입 공격 x0(날씨 지속 시스템은 비구현, flat 무효만).

import type { Action, AttackPredicateName, DamageMultiplier } from "./types";

type AttackAction = Extract<Action, { kind: "attack" }>;

/**
 * 명명 술어를 적용해 "곱할 인자"를 반환한다.
 * @param name 술어 이름
 * @param action 공격 action (타입·분류)
 * @param typeMultiplier 순수 타입 배율 (getEffectiveness 결과)
 */
export function applyPredicate(
  name: AttackPredicateName,
  action: AttackAction,
  typeMultiplier: DamageMultiplier,
): DamageMultiplier {
  switch (name) {
    case "filter":
      // 효과굉장(타입배율>1)이면 피해 ×0.75 (filter/solid-rock/prism-armor 공유).
      return typeMultiplier > 1 ? 0.75 : 1;
    case "multiscale":
      // HP 맥락 부재 → 풀피 가정으로 항상 ×0.5 (multiscale/shadow-shield).
      return 0.5;
    case "iceScales":
      // 특수기 피해 ×0.5.
      return action.category === "special" ? 0.5 : 1;
    case "furCoat":
      // 물리기 피해 ×0.5.
      return action.category === "physical" ? 0.5 : 1;
    case "wonderGuard":
      // 효과굉장만 통과(×1), 나머지는 전부 x0.
      return typeMultiplier > 1 ? 1 : 0;
    case "desolateLand":
      // 강한 햇살: 물 공격 무효.
      return action.attackType === "water" ? 0 : 1;
    case "primordialSea":
      // 강한 비: 불 공격 무효.
      return action.attackType === "fire" ? 0 : 1;
    default: {
      // 망라 검증: 새 술어 추가 시 컴파일 에러로 누락을 잡는다.
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}
