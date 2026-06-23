// 추측/피드백 계약 — 데일리 정답 선정 (ADR 결정(2): 시드 순열/셔플 전단사 + 2차 해시 ability)
//
// 권위 출처:
//  - ADR `docs/raw/feature/guess-feedback-contract/adr.md` 결정(2): 날짜 경계·시드·전단사·ability 파생.
//  - PRD 수용기준: 데일리 결정론 / 데일리 분포(전단사) / 타임존 클램프.
//
// 순수·결정론·정적. 외부 fetch 0. 모수 N = candidates.length(상수 하드코딩 금지).

import { candidates } from "../data";
import type { Secret } from "../engine";
import type { GameDate } from "./types";

// ── 게임 날짜 정규화(UTC 자정 앵커 + min(local, utc) 클램프) ──

const MS_PER_DAY = 86_400_000;

/** UTC epoch ms → 'YYYY-MM-DD'(UTC) 문자열. 음수 연도/패딩은 v1 범위 밖(현실 날짜만). */
function epochDayToGameDate(epochDay: number): GameDate {
  const date = new Date(epochDay * MS_PER_DAY);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * 현재 시각 → 게임 날짜(GameDate).
 *
 * - UTC 자정 앵커: epoch day = floor(utcMs / 1일).
 * - 타임존 클램프: min(local 게임날짜, utc 게임날짜)의 더 이른 날짜를 채택(쌍근식).
 *   기기 시계를 앞당겨도 다음 정답을 선취하지 못하도록 더 이른 날짜로 묶는다.
 *
 * @param now       기준 시각(ms). 기본 = Date.now().
 * @param tzOffsetMinutes  Date.prototype.getTimezoneOffset() 규약(UTC - local, 분).
 *   기본 = 현재 환경값. local epoch day = floor((utcMs - tzOffset*60000) / 1일).
 */
export function normalizeGameDate(now?: number, tzOffsetMinutes?: number): GameDate {
  const utcMs = now ?? Date.now();
  const offset = tzOffsetMinutes ?? new Date(utcMs).getTimezoneOffset();
  const utcDay = Math.floor(utcMs / MS_PER_DAY);
  // getTimezoneOffset = UTC - local(분). local 벽시계 ms = utcMs - offset*60000.
  const localDay = Math.floor((utcMs - offset * 60_000) / MS_PER_DAY);
  // 미래 선취 방지: 더 이른(작은) 게임 날짜로 클램프.
  return epochDayToGameDate(Math.min(utcDay, localDay));
}

/** GameDate('YYYY-MM-DD') → epoch day index(정수). 시드/순열은 이 값에서 파생. */
function gameDateToEpochDay(gameDate: GameDate): number {
  const [year, month, day] = gameDate.split("-").map((part) => Number.parseInt(part, 10));
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

// ── seedable PRNG (정적 정석: xmur3 + mulberry32) ──

/** 문자열 → 32bit 시드(xmur3). 호출 가능한 시드 스트림을 반환. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** 32bit 시드 → [0,1) 균등 난수 생성기(mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 전단사 순열(시드된 Fisher–Yates) ──

/**
 * 길이 n의 항등 배열 [0..n-1]을 시드된 Fisher–Yates로 셔플한 전단사 순열을 만든다.
 * 같은 seedKey → 같은 순열(결정론). n에 동적 의존(상수 하드코딩 금지).
 */
function seededPermutation(seedKey: string, n: number): number[] {
  const rng = mulberry32(xmur3(seedKey)());
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

// ── 데일리 정답 선정 ──

/**
 * 게임 날짜 → 오늘의 Secret(정답 candidate + 선택 ability). 순수·결정론.
 *
 * - candidate(전단사): 한 사이클(연속 N일) 동안 각 후보가 충돌 없이 한 번씩 나오도록
 *   사이클 인덱스로 시드된 Fisher–Yates 순열의 (dayIndex mod N)번째 항을 고른다.
 *   사이클이 바뀌면 시드가 달라져 순열이 재셔플된다(사이클 경계 결정론).
 * - ability(같은 시드 2차 파생): 같은 게임 날짜로 2차 해시(seed) mod abilities.length.
 *   candidate와 ability가 한 날짜로 함께 결정되어 Secret이 완성된다.
 */
export function dailyAnswer(gameDate: GameDate): Secret {
  const pool = candidates;
  const n = pool.length;

  const dayIndex = gameDateToEpochDay(gameDate);
  // 음수 epoch day(1970 이전)도 안전하게 사이클 인덱스를 산출(유클리드 mod).
  const cycleIndex = Math.floor(dayIndex / n);
  const positionInCycle = ((dayIndex % n) + n) % n;

  // 사이클 인덱스로 순열을 재셔플 → 사이클 경계마다 새 순열(전 세계 동일 결정론).
  const permutation = seededPermutation(`cycle:${cycleIndex}`, n);
  const candidate = pool[permutation[positionInCycle]];

  // ability: 같은 게임 날짜의 2차 해시로 candidate.abilities 인덱싱.
  const abilitySeed = xmur3(`ability:${gameDate}`)();
  const abilityIndex = abilitySeed % candidate.abilities.length;
  const ability = candidate.abilities[abilityIndex];

  return { candidate, ability };
}
