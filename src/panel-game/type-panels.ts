import { getEffectiveness } from "../data";
import type { PokemonType } from "../data";
import { ABILITY_WHITELIST } from "../engine";
import type { PanelGameAnswer } from "./types";

const PANEL_PREDICATES = new Set(["filter", "wonderGuard", "desolateLand", "primordialSea"]);

export function getTypePanelMultiplier(answer: PanelGameAnswer, attackType: PokemonType): number {
  const { candidate, ability } = answer;
  let multiplier = getEffectiveness(attackType, candidate.types);
  const record = ABILITY_WHITELIST[ability.id];
  const effects = record?.attack ? (Array.isArray(record.attack) ? record.attack : [record.attack]) : [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "immuneType":
      case "absorbBoost":
        if (attackType === effect.immuneTo) multiplier = 0;
        break;
      case "multiplier":
        if (effect.category) break;
        if (effect.appliesToTypes && !effect.appliesToTypes.includes(attackType)) break;
        multiplier *= effect.factor;
        break;
      case "predicate":
        if (!PANEL_PREDICATES.has(effect.predicate)) break;
        if (effect.predicate === "filter") {
          multiplier *= multiplier > 1 ? 0.75 : 1;
        } else if (effect.predicate === "wonderGuard") {
          multiplier *= multiplier > 1 ? 1 : 0;
        } else if (effect.predicate === "desolateLand") {
          multiplier *= attackType === "water" ? 0 : 1;
        } else if (effect.predicate === "primordialSea") {
          multiplier *= attackType === "fire" ? 0 : 1;
        }
        break;
      case "hitReaction":
        break;
    }
  }

  return Number(multiplier.toFixed(2));
}

export function formatTypeMultiplier(multiplier: number): string {
  return `x${multiplier.toFixed(2).replace(/\.?0+$/, "")}`;
}
