#!/usr/bin/env node
// 포켓몬 데이터 계약 생성 스크립트 (ADR: feature/pokemon-data-contract)
//
// PokéAPI api-data 정적 덤프의 "고정 커밋 SHA"에서 데이터를 수집해 정적 산출물을 만든다.
// - 앱 빌드/런타임이 아니라, 개발 시 가끔 명시 실행하는 생성 단계다(매 빌드 라이브 호출 X).
// - 청크(기본 50종) 단위로 수집 → 청크별 검증 → .cache에 저장(재개 가능) → 다음 청크.
// - 폼 정책: 원종 + 타입/특성이 원종과 다른 폼(지역폼·메가·원시회귀)만 포함.
//   gmax·외형/스탯 동일 폼은 types/abilities 비교로 자동 제외. arceus·silvally는 종 자체 제외.
//
// 실행:  node scripts/gen-pokemon-data.mjs
// 재실행 시 캐시된 청크는 건너뛴다. 강제 재수집: node scripts/gen-pokemon-data.mjs --fresh
// 산출물: src/data/{pokemon,typechart,meta}.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── 고정 스냅샷 (결정론 전제) ──────────────────────────────────────────────
const SHA = "652ba55aba718de1f415e7ab713ad25a34469a5a";
const SOURCE = "https://github.com/PokeAPI/api-data";
const BASE = `https://raw.githubusercontent.com/PokeAPI/api-data/${SHA}/data/api/v2`;

const MAX_SPECIES = 1025;
const CHUNK = 50;
const CONCURRENCY = 12;
const BLACKLIST = new Set(["arceus", "silvally"]); // 타입 룰렛 — 종 자체 제외

// 18 배틀 타입 (src/data/types.ts의 POKEMON_TYPES와 동기 유지)
const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const BATTLE_TYPES = new Set(POKEMON_TYPES);

const GEN_MAP = {
  "generation-i": 1, "generation-ii": 2, "generation-iii": 3, "generation-iv": 4,
  "generation-v": 5, "generation-vi": 6, "generation-vii": 7, "generation-viii": 8,
  "generation-ix": 9,
};
const REGION_KO = { alola: "알로라", galar: "가라르", hisui: "히스이", paldea: "팔데아" };
const REGION_EN = { alola: "Alolan", galar: "Galarian", hisui: "Hisuian", paldea: "Paldean" };

// 서브폼 슬러그 → 표시용 서술자.
// 이 스냅샷의 PokéAPI는 일부 폼(켄타로스 팔데아 3종, enamorus-therian, oinkologne-female 등)에
// form 파일/ko form_names가 없어, 슬러그에서만 폼을 식별할 수 있다. form_names가 있으면 그쪽을 우선한다.
const SUBFORM_KO = {
  "combat-breed": "컴뱃종", "blaze-breed": "블레이즈종", "aqua-breed": "아쿠아종", // 켄타로스 팔데아
  therian: "영물폼", // enamorus (tornadus/thundurus/landorus는 form_names 보유)
  female: "암컷", // oinkologne (meowstic/indeedee는 form_names 보유)
  "white-striped": "백색근의 모습", // basculin (적색근=원종/청색근=form_names 보유)
  "battle-bond": "유대변화", "own-tempo": "마이페이스", // greninja / rockruff (특성형)
  roaming: "도보폼", // gimmighoul (상자=원종)
  terastal: "테라스탈폼", stellar: "스텔라폼", // terapagos
  "yellow-plumage": "노랑 깃털", "white-plumage": "하양 깃털", // squawkabilly (초록=원종)
};
const SUBFORM_EN = {
  "combat-breed": "Combat", "blaze-breed": "Blaze", "aqua-breed": "Aqua", zen: "Zen",
  therian: "Therian", female: "Female", "white-striped": "White-Striped",
  "battle-bond": "Battle Bond", "own-tempo": "Own Tempo", roaming: "Roaming",
  terastal: "Terastal", stellar: "Stellar",
  "yellow-plumage": "Yellow Plumage", "white-plumage": "White Plumage",
};

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
// 스냅샷 SHA로 캐시를 네임스페이스 → SHA 갱신 시 옛 캐시를 재사용해 stale 데이터가 섞이는 사고 방지.
const CACHE_DIR = path.join(root, ".cache", "pokedata", SHA);
const OUT_DIR = path.join(root, "src", "data");
const FRESH = process.argv.includes("--fresh");

// ── fetch 유틸 ─────────────────────────────────────────────────────────────
function toUrl(p) {
  let rel = p.startsWith("/api/v2") ? p.slice("/api/v2".length) : p;
  if (!rel.endsWith("index.json")) rel = rel.replace(/\/?$/, "/") + "index.json";
  if (!rel.startsWith("/")) rel = "/" + rel;
  return `${BASE}${rel}`;
}

async function fetchJson(p, tries = 4) {
  const url = toUrl(p);
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "poke-battle-quiz-datagen" } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === tries) throw new Error(`fetch 실패 ${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
}

function nameByLang(names, lang) {
  return names?.find((n) => n.language?.name === lang)?.name ?? null;
}

function capitalize(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// 동시성 제한 풀
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

// ── 폼 분류 / 이름 합성 ─────────────────────────────────────────────────────
function classifyForm(name, formMeta) {
  if (formMeta?.is_mega || name.includes("-mega")) return "mega";
  if (name.includes("-primal")) return "primal";
  for (const r of Object.keys(REGION_KO)) if (name.includes(`-${r}`)) return "regional";
  return "other";
}

// 슬러그에서 원종명·리전 토큰을 떼어낸 서브폼 잔여부 (예: "tauros-paldea-combat-breed" → "combat-breed").
function slugRemainder(fullSlug, speciesName, region) {
  let rest = fullSlug.startsWith(`${speciesName}-`) ? fullSlug.slice(speciesName.length + 1) : fullSlug;
  if (region) rest = rest.replace(new RegExp(`(?:^|-)${region}(?:-|$)`), "-").replace(/^-+|-+$/g, "");
  return rest;
}

// ko form_names가 리전만 가리키는 마커("가라르의 모습")인지 — 서브폼 정보가 없다는 뜻.
function isRegionMarkerKo(formKo, region) {
  if (!formKo || !region) return false;
  return formKo.replace(/의?\s*모습$/, "").trim() === REGION_KO[region];
}

// 이름 규칙: 폼은 "원종(리전/서브폼)" 괄호 형식, 리전 먼저.
//  - 켄타로스(팔데아/컴뱃종), 나인테일(알로라), 춤추새(파칙파칙스타일)
//  - 메가/원시/로토무 가전·울트라네크로즈마처럼 form_names가 원종명을 품은 "완성형"은 그대로 둔다.
//  - 영어는 리전을 접두로 두고 서브폼만 괄호로(Galarian Darmanitan (Zen)) — 영어 관용 유지.
function buildNames(variety, isBase, baseKo, baseEn, formMeta, category, speciesName) {
  if (isBase) {
    return { ko: baseKo || baseEn, en: baseEn, koFallback: !baseKo };
  }
  const formKo = formMeta ? nameByLang(formMeta.form_names, "ko") : null;
  const formEn = formMeta ? nameByLang(formMeta.form_names, "en") : null;
  const region = Object.keys(REGION_KO).find((r) => variety.name.includes(`-${r}`));
  const rest = slugRemainder(variety.name, speciesName, region);

  // 1) 완성형 단독 이름: form_names ko가 원종명을 포함(메가리자몽X·히트로토무·울트라네크로즈마…)
  if (formKo && baseKo && formKo.includes(baseKo)) {
    const en = formEn && baseEn && formEn.includes(baseEn)
      ? formEn
      : category === "mega" && baseEn ? `Mega ${baseEn}`
      : category === "primal" && baseEn ? `Primal ${baseEn}`
      : baseEn || capitalize(variety.name);
    return { ko: formKo, en, koFallback: !baseKo };
  }
  if (category === "mega") {
    // X/Y 메가(라이츄 등 Z-A 신규)는 ko form_names가 없어 슬러그에서 접미를 살린다.
    const xy = variety.name.endsWith("-mega-x") ? " X" : variety.name.endsWith("-mega-y") ? " Y" : "";
    return { ko: baseKo ? `메가 ${baseKo}${xy}` : capitalize(variety.name), en: baseEn ? `Mega ${baseEn}${xy}` : capitalize(variety.name), koFallback: !baseKo };
  }
  if (category === "primal") {
    return { ko: baseKo ? `원시 ${baseKo}` : capitalize(variety.name), en: baseEn ? `Primal ${baseEn}` : capitalize(variety.name), koFallback: !baseKo };
  }

  // 2) "원종(리전/서브폼)" 괄호 형식
  // 한국어 서브폼: 리전 마커가 아닌 form_names ko 우선, 없으면 슬러그 매핑(켄타로스 팔데아 3종)
  let subKo = null;
  if (formKo && !isRegionMarkerKo(formKo, region) && !(baseKo && formKo.includes(baseKo))) subKo = formKo;
  else if (SUBFORM_KO[rest]) subKo = SUBFORM_KO[rest];

  const koParts = [];
  if (region) koParts.push(REGION_KO[region]);
  if (subKo) koParts.push(subKo);
  const ko = baseKo
    ? (koParts.length ? `${baseKo}(${koParts.join("/")})` : baseKo)
    : capitalize(variety.name);

  // 영어 서브폼: 리전이 있으면 슬러그 매핑(형식 불안정한 form_names en 회피),
  // 없으면 form_names en 우선, 그것도 없으면 슬러그 매핑 폴백.
  let subEn = null;
  if (region) {
    if (rest && rest !== "standard") subEn = SUBFORM_EN[rest] ?? null;
  } else if (formEn && !(baseEn && formEn.includes(baseEn))) {
    subEn = formEn;
  } else if (rest && rest !== "standard") {
    subEn = SUBFORM_EN[rest] ?? null;
  }
  const enBase = region && baseEn ? `${REGION_EN[region]} ${baseEn}` : (baseEn || capitalize(variety.name));
  const en = subEn ? `${enBase} (${subEn})` : enBase;

  return { ko, en, koFallback: !baseKo };
}

// ── 종 1건 처리 → Candidate[] ──────────────────────────────────────────────
async function processSpecies(id) {
  const empty = { candidates: [], excludedIdentical: 0, koFallbacks: [] };
  const sp = await fetchJson(`/pokemon-species/${id}/index.json`);
  if (!sp) return empty;
  const speciesName = sp.name;
  if (BLACKLIST.has(speciesName)) return empty;

  const generation = GEN_MAP[sp.generation?.name] ?? 0;
  const baseKo = nameByLang(sp.names, "ko");
  const baseEn = nameByLang(sp.names, "en") ?? capitalize(speciesName);

  const varieties = [];
  for (const v of sp.varieties ?? []) {
    // gmax(거다이맥스)·totem(나라모습)은 외형/크기만 다른 비전투 변종 — 리전 totem은 리전폼과 중복되므로 제외.
    if (v.pokemon.name.includes("-gmax") || v.pokemon.name.includes("-totem")) continue;
    const pk = await fetchJson(v.pokemon.url);
    if (!pk) continue;
    const types = pk.types.map((t) => t.type.name).filter((t) => BATTLE_TYPES.has(t));
    const abilities = pk.abilities.map((a) => ({ id: a.ability.name, hidden: a.is_hidden }));
    // 불완전/비표준 폼(타입 또는 특성 데이터 없음, 예: absol-mega-z)은 제외
    if (types.length < 1 || abilities.length < 1) continue;
    varieties.push({
      name: pk.name,
      isDefault: v.is_default,
      types,
      abilities,
      formUrl: pk.forms?.[0]?.url ?? null,
    });
  }

  const base = varieties.find((v) => v.isDefault) ?? varieties[0];
  if (!base) return empty;
  const baseTypeKey = [...base.types].sort().join(",");
  const baseAbilKey = base.abilities.map((a) => a.id).sort().join(",");

  const candidates = [];
  let excludedIdentical = 0;
  const koFallbacks = [];

  for (const v of varieties) {
    let include = v.isDefault;
    if (!v.isDefault) {
      const tKey = [...v.types].sort().join(",");
      const aKey = v.abilities.map((a) => a.id).sort().join(",");
      include = tKey !== baseTypeKey || aKey !== baseAbilKey; // 타입 또는 특성이 원종과 다름
    }
    if (!include) {
      excludedIdentical++;
      continue;
    }
    let formMeta = null;
    if (!v.isDefault && v.formUrl) formMeta = await fetchJson(v.formUrl);
    const category = v.isDefault ? "base" : classifyForm(v.name, formMeta);
    const { ko, en, koFallback } = buildNames(v, v.isDefault, baseKo, baseEn, formMeta, category, speciesName);
    if (koFallback) koFallbacks.push(v.name);
    candidates.push({
      id: v.name,
      speciesId: id,
      speciesName,
      isDefault: v.isDefault,
      formCategory: category,
      types: v.types,
      abilities: v.abilities,
      generation,
      nameKo: ko,
      nameEn: en,
    });
  }
  return { candidates, excludedIdentical, koFallbacks };
}

// ── 타입 상성표 ────────────────────────────────────────────────────────────
async function buildTypeChart() {
  const chart = {};
  for (const t of POKEMON_TYPES) {
    chart[t] = {};
    for (const d of POKEMON_TYPES) chart[t][d] = 1;
  }
  // PokéAPI type id 1~18 = 18 배틀 타입
  for (let id = 1; id <= 18; id++) {
    const ty = await fetchJson(`/type/${id}/index.json`);
    const atk = ty?.name;
    if (!atk || !BATTLE_TYPES.has(atk)) continue;
    const dr = ty.damage_relations;
    for (const x of dr.double_damage_to) if (BATTLE_TYPES.has(x.name)) chart[atk][x.name] = 2;
    for (const x of dr.half_damage_to) if (BATTLE_TYPES.has(x.name)) chart[atk][x.name] = 0.5;
    for (const x of dr.no_damage_to) if (BATTLE_TYPES.has(x.name)) chart[atk][x.name] = 0;
  }
  return chart;
}

// ── 검증 ───────────────────────────────────────────────────────────────────
function validateCandidate(c) {
  const ok =
    typeof c.id === "string" && c.id.length > 0 &&
    Number.isInteger(c.speciesId) && c.speciesId >= 1 &&
    typeof c.speciesName === "string" &&
    typeof c.isDefault === "boolean" &&
    ["base", "mega", "primal", "regional", "other"].includes(c.formCategory) &&
    Array.isArray(c.types) && c.types.length >= 1 && c.types.length <= 2 &&
    c.types.every((t) => BATTLE_TYPES.has(t)) &&
    Array.isArray(c.abilities) && c.abilities.length >= 1 &&
    c.abilities.every((a) => typeof a.id === "string" && typeof a.hidden === "boolean") &&
    Number.isInteger(c.generation) && c.generation >= 1 && c.generation <= 9 &&
    typeof c.nameKo === "string" && c.nameKo.length > 0 &&
    typeof c.nameEn === "string" && c.nameEn.length > 0;
  if (!ok) throw new Error(`Candidate 스키마 위반: ${JSON.stringify(c)}`);
}

function validateAll(candidates, chart) {
  if (candidates.length === 0) throw new Error("후보 0건 — 수집 실패");
  candidates.forEach(validateCandidate);
  for (const a of POKEMON_TYPES) {
    if (!chart[a]) throw new Error(`typechart 공격타입 누락: ${a}`);
    for (const d of POKEMON_TYPES) {
      if (![0, 0.5, 1, 2].includes(chart[a][d])) throw new Error(`typechart 배수 이상: ${a}->${d}=${chart[a][d]}`);
    }
  }
  // 알려진 케이스 sanity (상세 검증은 vitest)
  const must = [["water", "fire", 2], ["electric", "ground", 0], ["normal", "ghost", 0], ["fairy", "dragon", 2]];
  for (const [a, d, exp] of must) {
    if (chart[a][d] !== exp) throw new Error(`typechart 검증 실패: ${a}->${d} = ${chart[a][d]} (기대 ${exp})`);
  }
  for (const c of candidates) {
    if (BLACKLIST.has(c.speciesName)) throw new Error(`블랙리스트 누수: ${c.id}`);
  }
  // 표시 이름 유일성: 타입이 다른 폼이 같은 이름으로 뭉개지면 추론 신호가 사라진다.
  const dupKo = new Map();
  const seenKo = new Map();
  for (const c of candidates) {
    if (seenKo.has(c.nameKo)) dupKo.set(c.nameKo, [...(dupKo.get(c.nameKo) ?? [seenKo.get(c.nameKo)]), c.id]);
    else seenKo.set(c.nameKo, c.id);
  }
  if (dupKo.size > 0) {
    const lines = [...dupKo.entries()].map(([n, ids]) => `  "${n}" ← ${ids.join(", ")}`).join("\n");
    throw new Error(`중복 nameKo ${dupKo.size}건 (폼 식별 불가):\n${lines}`);
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data));
}

// ── 메인 ───────────────────────────────────────────────────────────────────
async function run() {
  if (FRESH && fs.existsSync(CACHE_DIR)) fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const all = [];
  let excludedIdentical = 0;
  const koFallbacks = [];
  const startedAt = Date.now();

  for (let from = 1; from <= MAX_SPECIES; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, MAX_SPECIES);
    const cacheFile = path.join(CACHE_DIR, `species-${String(from).padStart(4, "0")}-${String(to).padStart(4, "0")}.json`);
    let chunk;
    if (fs.existsSync(cacheFile)) {
      chunk = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      console.log(`[cache]  species ${from}-${to}: ${chunk.candidates.length} candidates`);
    } else {
      chunk = { candidates: [], excludedIdentical: 0, koFallbacks: [] };
      const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      const results = await pool(ids, CONCURRENCY, processSpecies);
      for (const r of results) {
        chunk.candidates.push(...r.candidates);
        chunk.excludedIdentical += r.excludedIdentical;
        chunk.koFallbacks.push(...r.koFallbacks);
      }
      chunk.candidates.forEach(validateCandidate); // 청크별 검증
      writeJson(cacheFile, chunk);
      console.log(`[fetch]  species ${from}-${to}: ${chunk.candidates.length} candidates (제외 동일폼 ${chunk.excludedIdentical})`);
    }
    all.push(...chunk.candidates);
    excludedIdentical += chunk.excludedIdentical;
    koFallbacks.push(...chunk.koFallbacks);
  }

  console.log(`[type]   타입 상성표 수집…`);
  const typeChart = await buildTypeChart();

  validateAll(all, typeChart);

  // 정렬: 도감번호 → 원종 먼저 → 폼 이름
  all.sort((a, b) => a.speciesId - b.speciesId || Number(b.isDefault) - Number(a.isDefault) || a.id.localeCompare(b.id));

  const baseCount = all.filter((c) => c.isDefault).length;
  const formCount = all.length - baseCount;
  const meta = {
    source: SOURCE,
    sha: SHA,
    generatedAt: new Date(startedAt).toISOString(),
    totalCandidates: all.length,
    baseSpeciesCount: baseCount,
    formCount,
    blacklistedSpecies: [...BLACKLIST],
    excludedIdenticalForms: excludedIdentical,
    koFallbacks,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeJson(path.join(OUT_DIR, "pokemon.json"), all);
  writeJson(path.join(OUT_DIR, "typechart.json"), typeChart);
  writeJson(path.join(OUT_DIR, "meta.json"), meta);

  console.log(`\n[done] 후보 ${all.length}건 (원종 ${baseCount} + 폼 ${formCount}), 제외 동일폼 ${excludedIdentical}, ko 폴백 ${koFallbacks.length}`);
  console.log(`[done] 산출물: src/data/pokemon.json, typechart.json, meta.json`);
}

run().catch((e) => {
  console.error("[error]", e.message);
  process.exit(1);
});
