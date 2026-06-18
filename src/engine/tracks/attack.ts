// 배틀 판정 엔진 — (A) 공격 트랙 해석기
//
// 처리 순서(청사진 5절):
//  ① getEffectiveness(타입배율) → ② 화이트리스트 조회 → ③ C1 면역(immuneType/absorbBoost→multiplier 0 [+rank])
//  → ④ C2 multiplier(factor 곱) → ⑤ predicate(곱/0) → ⑥ C3 피격랭크(조건 매칭 시 rank 동반, 미스 생략)
//  → damage Clue. 화이트리스트 밖이면 순수 타입배율만(안전 폴백).
//
// x0 통합: 타입 면역(getEffectiveness=0)과 특성 면역(immuneType/술어 0)이 동일 multiplier:0을 낸다.

import { getEffectiveness } from "../../data";
import type { PokemonType } from "../../data/types";
import { getAbilityRecord } from "../abilities";
import { applyPredicate } from "../predicates";
import type { Action, AttackEffect, Clue, DamageMultiplier, HitTrigger, Secret } from "../types";

type AttackAction = Extract<Action, { kind: "attack" }>;

export function interpretAttack(action: Readonly<Action>, secret: Readonly<Secret>): readonly Clue[] {
  if (action.kind !== "attack") return [];

  const typeMultiplier = getEffectiveness(action.attackType, secret.candidate.types);
  const record = getAbilityRecord(secret.ability.id);

  // 화이트리스트 밖 → 순수 타입 배율만 (안전 폴백).
  if (!record?.attack) {
    return [{ kind: "damage", multiplier: typeMultiplier }];
  }

  const effects: AttackEffect[] = Array.isArray(record.attack) ? record.attack : [record.attack];

  let multiplier: DamageMultiplier = typeMultiplier;
  const rankClues: Clue[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "immuneType": {
        if (action.attackType === effect.immuneTo) multiplier = 0;
        break;
      }
      case "absorbBoost": {
        if (action.attackType === effect.immuneTo) {
          multiplier = 0;
          rankClues.push({ kind: "rank", target: "secret", stat: effect.stat, delta: effect.delta });
        }
        break;
      }
      case "multiplier": {
        if (matchesMultiplier(effect.appliesToTypes, effect.category, action)) {
          multiplier *= effect.factor;
        }
        break;
      }
      case "predicate": {
        multiplier *= applyPredicate(effect.predicate, action, typeMultiplier);
        break;
      }
      case "hitReaction": {
        if (matchesHitTrigger(effect.trigger, action)) {
          for (const boost of effect.boosts) {
            rankClues.push({ kind: "rank", target: "secret", stat: boost.stat, delta: boost.delta });
          }
        }
        break;
      }
    }
  }

  return [{ kind: "damage", multiplier }, ...rankClues];
}

function matchesMultiplier(
  appliesToTypes: PokemonType[] | undefined,
  category: "physical" | "special" | undefined,
  action: AttackAction,
): boolean {
  if (appliesToTypes && !appliesToTypes.includes(action.attackType)) return false;
  if (category && category !== action.category) return false;
  return true;
}

function matchesHitTrigger(trigger: HitTrigger, action: AttackAction): boolean {
  switch (trigger.kind) {
    case "always":
      return true;
    case "category":
      return trigger.category === action.category;
    case "types":
      return trigger.types.includes(action.attackType);
  }
}
