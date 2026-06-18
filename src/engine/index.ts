// 배틀 판정 엔진 — 공개 표면 (오케스트레이터 + 트랙 레지스트리 + re-export)
//
// 두 순수 연산(ADR 결정(1)):
//  - judge(action, secret): 유저 행동 판정. action.kind로 attack/status/stat 트랙 분기.
//  - entryClues(secret): 정답 등장 판정.
//
// 트랙 레지스트리 균일화: 각 해석기는 자기 입력이 아니면 [] 반환. flatMap으로 합친다.
// C5 seam: ATTACK_LIKE_TRACKS 에 interpretOffense 추가만으로 확장 (코어 flatMap 무수정).

import { interpretAttack } from "./tracks/attack";
import { interpretEntry } from "./tracks/entry";
import { interpretStat } from "./tracks/stat";
import { interpretStatus } from "./tracks/status";
import type { Action, Clue, Secret } from "./types";

/** 유저 행동 트랙(공격/상태기/랭크기). 각자 자기 입력이 아니면 []. */
const ATTACK_LIKE_TRACKS = [interpretAttack, interpretStatus, interpretStat] as const;
// C5 seam(후속): ATTACK_LIKE_TRACKS 에 interpretOffense 를 추가한다(코어 무수정).

/** 유저 한 행동을 구조화 단서로 변환(순수·결정론·단발). */
export function judge(action: Readonly<Action>, secret: Readonly<Secret>): readonly Clue[] {
  return ATTACK_LIKE_TRACKS.flatMap((track) => track(action, secret));
}

/** 정답 등장을 구조화 단서로 변환. */
export function entryClues(secret: Readonly<Secret>): readonly Clue[] {
  return interpretEntry(secret);
}

// 공개 계약 타입 re-export (소비처: guess-feedback-contract / battle-turn-ui).
export type {
  AbilityRecord,
  Action,
  AttackEffect,
  AttackPredicateName,
  Clue,
  DamageMultiplier,
  EntryAbilityEffect,
  EntryEffect,
  HitTrigger,
  Judge,
  EntryClues,
  Secret,
  StatAbilityEffect,
  StatId,
  StatusAbilityEffect,
  StatusId,
  TerrainId,
  WeatherId,
} from "./types";
export { assertNever } from "./types";
export { ABILITY_WHITELIST, getAbilityRecord } from "./abilities";
