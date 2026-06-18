// 배틀 판정 엔진 — (D) 랭크기 트랙 해석기
//
// 보강3 → rank · marker('stat-reflect'). 적용 순서(ADR (5)): 차단 > 반전/증폭 > 반응 > 반사(marker).
//  - block/blockAndReact: 해당 스탯 하락 차단 → delta 0 (입력 stages가 하락일 때).
//  - invert(contrary): 부호 반전. amplify(simple): ×factor.
//  - react/blockAndReact: 스탯하락(입력 stages<0) 시 자기 다른 스탯 랭크업 동반.
//  - reflect(mirror-armor): 델타 대상 없음 → marker('stat-reflect')만.
//  - 화이트리스트 밖 → rank{delta:입력 stages}(정상 적용 폴백).
//
// guard-dog 실증: 차단(delta 0)을 먼저, 반응(atk+1)을 더해 두 Clue 모두 방출(차단>반응).

import { getAbilityRecord } from "../abilities";
import { assertNever } from "../types";
import type { Action, Clue, Secret, StatId } from "../types";

export function interpretStat(action: Readonly<Action>, secret: Readonly<Secret>): readonly Clue[] {
  if (action.kind !== "stat") return [];

  const effect = getAbilityRecord(secret.ability.id)?.stat;
  const { stat, stages } = action;

  // 화이트리스트 밖 → 정상 적용 폴백.
  if (!effect) return [normalRank(stat, stages)];

  switch (effect.kind) {
    case "block":
      // stats 미지정=전스탯 차단. 지정 시 해당 스탯만 차단.
      // 차단 대상이면 delta 0, 아니면 정상 적용(예: hyper-cutter는 atk만 막아 def-1은 정상 -1).
      return isBlocked(effect.stats, stat)
        ? [{ kind: "rank", target: "secret", stat, delta: 0 }]
        : [normalRank(stat, stages)];
    case "invert":
      return [{ kind: "rank", target: "secret", stat, delta: -stages }];
    case "amplify":
      return [{ kind: "rank", target: "secret", stat, delta: stages * effect.factor }];
    case "react": {
      // 정상 적용 + (하락 시) 자기 다른 스탯 랭크업.
      const clues: Clue[] = [normalRank(stat, stages)];
      if (stages < 0) {
        clues.push({ kind: "rank", target: "secret", stat: effect.stat, delta: effect.delta });
      }
      return clues;
    }
    case "blockAndReact": {
      // 차단(delta 0) 먼저 + (하락 시) 반응 랭크업. 차단>반응 순서 실증.
      const clues: Clue[] = [{ kind: "rank", target: "secret", stat, delta: 0 }];
      if (stages < 0) {
        clues.push({ kind: "rank", target: "secret", stat: effect.stat, delta: effect.delta });
      }
      return clues;
    }
    case "reflect":
      return [{ kind: "marker", marker: "stat-reflect" }];
    default:
      return assertNever(effect);
  }
}

function normalRank(stat: StatId, stages: number): Clue {
  return { kind: "rank", target: "secret", stat, delta: stages };
}

function isBlocked(stats: StatId[] | undefined, stat: StatId): boolean {
  return stats ? stats.includes(stat) : true;
}
