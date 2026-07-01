#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const cache = new Map();

function resolveRelative(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    `${base}.ts`,
    `${base}.json`,
    path.join(base, "index.ts"),
    path.join(base, "index.json"),
    base,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Cannot resolve ${specifier} from ${fromFile}`);
}

function loadTsModule(entry) {
  const full = path.resolve(entry);
  if (cache.has(full)) return cache.get(full).exports;
  if (full.endsWith(".json")) return JSON.parse(fs.readFileSync(full, "utf8"));

  const source = fs.readFileSync(full, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      resolveJsonModule: true,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    fileName: full,
  }).outputText;

  const module = { exports: {} };
  cache.set(full, module);

  const localRequire = (specifier) =>
    specifier.startsWith(".") ? loadTsModule(resolveRelative(full, specifier)) : require(specifier);

  vm.runInNewContext(
    transpiled,
    {
      module,
      exports: module.exports,
      require: localRequire,
      __dirname: path.dirname(full),
      __filename: full,
      console,
      process,
    },
    { filename: full },
  );

  return module.exports;
}

const { candidates } = loadTsModule(path.join(root, "src/data/index.ts"));
const { SHOWDOWN_ID_ALIASES, getEligibilityReason, isEligibleCandidate } = loadTsModule(
  path.join(root, "src/panel-game/eligibility.ts"),
);

const pokedex = loadTsModule(path.join(root, ".reference-repos/pokemon-showdown/data/pokedex.ts")).Pokedex;
const swshFormats = loadTsModule(
  path.join(root, ".reference-repos/pokemon-showdown/data/mods/gen8/formats-data.ts"),
).FormatsData;
const laFormats = loadTsModule(
  path.join(root, ".reference-repos/pokemon-showdown/data/mods/gen8legends/formats-data.ts"),
).FormatsData;
const svFormats = loadTsModule(path.join(root, ".reference-repos/pokemon-showdown/data/formats-data.ts")).FormatsData;
const zaFormats = loadTsModule(
  path.join(root, ".reference-repos/pokemon-showdown/data/mods/gen9legends/formats-data.ts"),
).FormatsData;

const bySpecies = new Map();
for (const candidate of candidates) {
  const bucket = bySpecies.get(candidate.speciesId) ?? [];
  bucket.push(candidate);
  bySpecies.set(candidate.speciesId, bucket);
}

function toShowdownId(candidateId) {
  return SHOWDOWN_ID_ALIASES[candidateId] ?? candidateId.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toDexKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getDexEntry(candidate) {
  const entry = pokedex[toShowdownId(candidate.id)];
  if (!entry) throw new Error(`Missing Showdown entry for ${candidate.id}`);
  return entry;
}

function lowKickPower(weightkg) {
  if (weightkg < 10) return 20;
  if (weightkg < 25) return 40;
  if (weightkg < 50) return 60;
  if (weightkg < 100) return 80;
  if (weightkg < 200) return 100;
  return 120;
}

function beastBoostLabel(baseStats) {
  const stats = [
    ["H", baseStats.hp],
    ["A", baseStats.atk],
    ["B", baseStats.def],
    ["C", baseStats.spa],
    ["D", baseStats.spd],
    ["S", baseStats.spe],
  ];
  const max = Math.max(...stats.map(([, value]) => value));
  return stats
    .filter(([, value]) => value === max)
    .map(([label]) => label)
    .join("/");
}

function getLineageKeys(entry) {
  const lineageKeys = new Set();
  const seedKey = toDexKey(entry.name);

  let currentKey = seedKey;
  while (currentKey) {
    const current = pokedex[currentKey];
    if (!current || lineageKeys.has(currentKey)) break;
    lineageKeys.add(currentKey);
    currentKey = current.prevo ? toDexKey(current.prevo) : "";
  }

  const queue = [seedKey];
  while (queue.length > 0) {
    const key = queue.shift();
    if (!key) continue;
    const current = pokedex[key];
    if (!current) continue;
    lineageKeys.add(key);
    for (const next of current.evos ?? []) {
      const nextKey = toDexKey(next);
      if (lineageKeys.has(nextKey)) continue;
      queue.push(nextKey);
    }
  }

  return lineageKeys;
}

function belongsToFamily(candidateEntry, familyKeys) {
  const relationKeys = [
    candidateEntry.baseSpecies,
    candidateEntry.changesFrom,
    candidateEntry.name,
  ]
    .filter(Boolean)
    .map((value) => toDexKey(value));

  return relationKeys.some((key) => familyKeys.has(key));
}

function hasMegaEvolution(entry) {
  const familyKeys = getLineageKeys(entry);
  return Object.values(pokedex).some(
    (candidateEntry) =>
      belongsToFamily(candidateEntry, familyKeys) &&
      (String(candidateEntry.name).includes("-Mega") || String(candidateEntry.forme ?? "").includes("Mega")),
  );
}

function hasGigantamax(entry) {
  const familyKeys = getLineageKeys(entry);
  return Object.values(pokedex).some(
    (candidateEntry) =>
      belongsToFamily(candidateEntry, familyKeys) &&
      (candidateEntry.canGigantamax ||
        candidateEntry.forme === "Gmax" ||
        String(candidateEntry.name).endsWith("-Gmax")),
  );
}

function titleAvailability(formats, candidateId) {
  const entry = formats[toShowdownId(candidateId)];
  if (!entry) return false;
  return entry.isNonstandard !== "Past" && entry.isNonstandard !== "Future";
}

const metadata = candidates.map((candidate) => {
  const dexEntry = getDexEntry(candidate);
  const eligibilityReason = getEligibilityReason(candidate, dexEntry);
  return {
    candidateId: candidate.id,
    eligible: isEligibleCandidate(candidate, dexEntry),
    eligibilityReason,
    lowKickPower: lowKickPower(dexEntry.weightkg),
    beastBoost: beastBoostLabel(dexEntry.baseStats),
    evioliteEligible: Boolean(dexEntry.evos?.length),
    hasMegaEvolution: hasMegaEvolution(dexEntry),
    hasGigantamax: hasGigantamax(dexEntry),
    titleAvailability: {
      swsh: titleAvailability(swshFormats, candidate.id),
      la: titleAvailability(laFormats, candidate.id),
      sv: titleAvailability(svFormats, candidate.id),
      za: titleAvailability(zaFormats, candidate.id),
    },
  };
});

const outFile = path.join(root, "src/panel-game/panel-metadata.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(metadata, null, 2)}\n`);

console.log(`[panel-metadata] generated ${path.relative(root, outFile)} (${metadata.length} entries)`);
