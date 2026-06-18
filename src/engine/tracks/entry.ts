// 배틀 판정 엔진 — (B) 등장 트랙 해석기
//
// C4 등장 발동 + C7 설치(보강1) → entry(날씨/필드 설치) · rank(자신 부스트) · marker(intimidate).
// entryClues(secret) 전용. 화이트리스트 entry 슬롯이 없으면 [].

import { getAbilityRecord } from "../abilities";
import { assertNever } from "../types";
import type { Clue, Secret } from "../types";

export function interpretEntry(secret: Readonly<Secret>): readonly Clue[] {
  const effect = getAbilityRecord(secret.ability.id)?.entry;
  if (!effect) return [];

  switch (effect.kind) {
    case "setWeather":
      return [{ kind: "entry", effect: { kind: "weather", weather: effect.weather } }];
    case "setTerrain":
      return [{ kind: "entry", effect: { kind: "terrain", terrain: effect.terrain } }];
    case "selfBoost":
      return [{ kind: "rank", target: "secret", stat: effect.stat, delta: effect.delta }];
    case "marker":
      return [{ kind: "marker", marker: effect.marker }];
    default:
      return assertNever(effect);
  }
}
