import { getCandidate } from "../data";
import { eligibleCandidates } from "./metadata";
import type { GameDate, PanelGameAnswer, PanelReveal } from "./types";
import { normalizeGameDate } from "../session/dailyAnswer";

const MS_PER_DAY = 86_400_000;

function gameDateToEpochDay(gameDate: GameDate): number {
  const [year, month, day] = gameDate.split("-").map((part) => Number.parseInt(part, 10));
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

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

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function seededPermutation(seedKey: string, size: number): number[] {
  const random = mulberry32(xmur3(seedKey)());
  const order = Array.from({ length: size }, (_, index) => index);

  for (let index = size - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temp = order[index];
    order[index] = order[swapIndex];
    order[swapIndex] = temp;
  }

  return order;
}

export function selectPanelAnswer(gameDate: GameDate): PanelGameAnswer {
  const pool = eligibleCandidates;
  const size = pool.length;
  const dayIndex = gameDateToEpochDay(gameDate);
  const cycleIndex = Math.floor(dayIndex / size);
  const positionInCycle = ((dayIndex % size) + size) % size;
  const permutation = seededPermutation(`panel-cycle:${cycleIndex}`, size);
  const candidate = pool[permutation[positionInCycle]];
  const abilitySeed = xmur3(`panel-ability:${gameDate}`)();
  const ability = candidate.abilities[abilitySeed % candidate.abilities.length];

  return { candidate, ability };
}

export function getTodayPanelAnswer(now?: number, tzOffsetMinutes?: number): PanelGameAnswer {
  return selectPanelAnswer(normalizeGameDate(now, tzOffsetMinutes));
}

export function getPanelReveal(answer: PanelGameAnswer): PanelReveal {
  return {
    candidateId: answer.candidate.id,
    nameKo: answer.candidate.nameKo,
    abilityId: answer.ability.id,
    types: answer.candidate.types,
  };
}

export function getEligibleCandidate(candidateId: string) {
  return getCandidate(candidateId);
}
