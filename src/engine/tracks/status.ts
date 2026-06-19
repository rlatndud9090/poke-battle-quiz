// 배틀 판정 엔진 — (C) 상태기 트랙 해석기
//
// 보강2 상태 면역/반사 → status{result:'immune'} · marker('status-reflect') · status{result:'applied'}(폴백).
//  - immune/immuneAll 에 해당 status 포함 → immune.
//  - reflect 에 해당 status 포함 → marker('status-reflect') (반사는 result variant 없이 marker로 일원화).
//  - 화이트리스트 밖/미해당 → applied (정상 적용 폴백).

import { getAbilityRecord } from "../abilities";
import { assertNever } from "../types";
import type { Action, Clue, Secret } from "../types";

export function interpretStatus(action: Readonly<Action>, secret: Readonly<Secret>): readonly Clue[] {
  if (action.kind !== "status") return [];

  const effect = getAbilityRecord(secret.ability.id)?.status;
  const applied: Clue = { kind: "status", status: action.status, result: "applied" };
  if (!effect) return [applied];

  switch (effect.kind) {
    case "immune":
      return effect.blocks.includes(action.status)
        ? [{ kind: "status", status: action.status, result: "immune" }]
        : [applied];
    case "immuneAll":
      // 정화의소금·절대안깸은 비휘발성(주요) 상태만 막는다. 혼란(휘발성)은 막지 못함 → 정상 적용.
      return action.status === "confusion"
        ? [applied]
        : [{ kind: "status", status: action.status, result: "immune" }];
    case "reflect":
      return effect.reflects.includes(action.status) ? [{ kind: "marker", marker: "status-reflect" }] : [applied];
    default:
      return assertNever(effect);
  }
}
