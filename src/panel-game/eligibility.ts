import type { Candidate } from "../data";

export interface DexEntryLike {
  battleOnly?: string;
}

export const SHOWDOWN_ID_ALIASES: Readonly<Record<string, string>> = {
  "tauros-paldea-aqua-breed": "taurospaldeaaqua",
  "tauros-paldea-blaze-breed": "taurospaldeablaze",
  "tauros-paldea-combat-breed": "taurospaldeacombat",
  "deoxys-normal": "deoxys",
  "wormadam-plant": "wormadam",
  "giratina-altered": "giratina",
  "shaymin-land": "shaymin",
  "basculin-red-striped": "basculin",
  "darmanitan-standard": "darmanitan",
  "darmanitan-galar-standard": "darmanitangalar",
  "frillish-male": "frillish",
  "jellicent-male": "jellicent",
  "tornadus-incarnate": "tornadus",
  "thundurus-incarnate": "thundurus",
  "landorus-incarnate": "landorus",
  "keldeo-ordinary": "keldeo",
  "meloetta-aria": "meloetta",
  "greninja-battle-bond": "greninjabond",
  "pyroar-male": "pyroar",
  "meowstic-male": "meowstic",
  "meowstic-female": "meowsticf",
  "meowstic-mega": "meowsticmmega",
  "aegislash-shield": "aegislash",
  "pumpkaboo-average": "pumpkaboo",
  "gourgeist-average": "gourgeist",
  "zygarde-50": "zygarde",
  "zygarde-10-power-construct": "zygarde10",
  "zygarde-50-power-construct": "zygarde",
  "oricorio-baile": "oricorio",
  "rockruff-own-tempo": "rockruffdusk",
  "lycanroc-midday": "lycanroc",
  "wishiwashi-solo": "wishiwashi",
  "minior-red-meteor": "miniormeteor",
  "mimikyu-disguised": "mimikyu",
  "necrozma-dawn": "necrozmadawnwings",
  "necrozma-dusk": "necrozmaduskmane",
  "toxtricity-amped": "toxtricity",
  "eiscue-ice": "eiscue",
  "indeedee-male": "indeedee",
  "indeedee-female": "indeedeef",
  "morpeko-full-belly": "morpeko",
  "urshifu-single-strike": "urshifu",
  "basculegion-male": "basculegion",
  "enamorus-incarnate": "enamorus",
  "oinkologne-male": "oinkologne",
  "oinkologne-female": "oinkolognef",
  "maushold-family-of-four": "mausholdfour",
  "squawkabilly-green-plumage": "squawkabilly",
  "squawkabilly-white-plumage": "squawkabillywhite",
  "squawkabilly-yellow-plumage": "squawkabillyyellow",
  "palafin-zero": "palafin",
  "tatsugiri-curly": "tatsugiri",
  "dudunsparce-two-segment": "dudunsparce",
  "ogerpon-cornerstone-mask": "ogerponcornerstone",
  "ogerpon-hearthflame-mask": "ogerponhearthflame",
  "ogerpon-wellspring-mask": "ogerponwellspring",
};

const EXCLUDED_EXACT_IDS = new Set([
  "greninja-battle-bond",
  "greninja-ash",
  "rockruff-own-tempo",
  "zygarde-10-power-construct",
  "zygarde-50-power-construct",
]);

const EXCLUDED_PREFIXES = [
  "pyroar-",
  "meowstic-",
  "frillish-",
  "jellicent-",
  "indeedee-",
  "oinkologne-",
  "maushold-",
  "squawkabilly-",
  "pumpkaboo-",
  "gourgeist-",
  "tatsugiri-",
  "basculegion-",
  "basculin-blue-striped",
  "basculin-white-striped",
  "dudunsparce-",
];

export function toShowdownId(candidateId: string): string {
  return SHOWDOWN_ID_ALIASES[candidateId] ?? candidateId.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getEligibilityReason(candidate: Candidate, dexEntry: DexEntryLike): string {
  if (candidate.isDefault) return "base";
  if (candidate.formCategory === "mega") return "excluded:mega";
  if (candidate.formCategory === "primal") return "excluded:primal";
  if (dexEntry.battleOnly) return "excluded:battle-only";
  if (EXCLUDED_EXACT_IDS.has(candidate.id)) return "excluded:special-form";
  if (EXCLUDED_PREFIXES.some((prefix) => candidate.id.startsWith(prefix))) return "excluded:subform";
  if (candidate.formCategory === "regional") return "stable-form";
  return "stable-form";
}

export function isEligibleCandidate(candidate: Candidate, dexEntry: DexEntryLike): boolean {
  return !getEligibilityReason(candidate, dexEntry).startsWith("excluded:");
}
