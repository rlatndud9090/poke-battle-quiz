# Data Source Strategy

This project should treat Pokemon data as imported reference data, then convert it
into a small quiz-specific database. The app should not try to run a full battle
simulator. It only needs deterministic hint-producing interactions.

## Recommended Sources

### 1. Pokemon Showdown

Use Pokemon Showdown as the primary reference for battle-facing data and exact
mechanics.

Useful local reference files:

- `.reference-repos/pokemon-showdown/data/pokedex.ts`
- `.reference-repos/pokemon-showdown/data/learnsets.ts`
- `.reference-repos/pokemon-showdown/data/moves.ts`
- `.reference-repos/pokemon-showdown/data/abilities.ts`
- `.reference-repos/pokemon-showdown/data/typechart.ts`
- `.reference-repos/pokemon-showdown/data/conditions.ts`
- `.reference-repos/pokemon-showdown/data/text/*.ts`
- `.reference-repos/pokemon-showdown/sim/battle-actions.ts`

Best uses:

- Pokemon typing, abilities, base stats, forms
- Full learnsets / move pools
- Type effectiveness
- Ability trigger behavior such as Speed Boost, Stamina, Defiant, and Guts
- Status and damage-rule edge cases

Do not import the full simulator into the product at the start. Extract or
generate normalized data, then implement a tiny quiz rule engine.

### 2. PokeAPI

Use PokeAPI for API-shaped canonical data, localization, and sprite URLs.

Relevant endpoints:

- `/api/v2/pokemon/{id or name}`: types, abilities, stats, sprites, moves with
  `version_group_details`
- `/api/v2/pokemon-species/{id or name}`: localized names and species metadata
- `/api/v2/move/{id or name}`: move type, power, category, ailment metadata,
  stat changes, localized names
- `/api/v2/ability/{id or name}`: localized names and effect text
- `/api/v2/type/{id or name}`: type damage relations

PokeAPI asks clients to cache locally, so use build-time import scripts or a
checked-in generated snapshot rather than repeatedly fetching from the browser.

### 3. PokeAPI Sprites

Use PokeAPI Sprites for sprite/official-art paths. Do not clone the whole sprite
repo by default because it is asset-heavy.

Good initial choices:

- Official artwork for reveal/share/result screens
- Showdown-style animated sprites for the battle panel
- Small icon sprites for autocomplete/result rows

Use URL templates or a generated sprite manifest keyed by national dex number.

### 4. Pokemantle

Use Pokemantle as a reference for daily puzzle flow, local persistence, sharing,
and rank/guess API shape.

Useful local reference files:

- `.reference-repos/pokemantle/frontend/composables/states.ts`
- `.reference-repos/pokemantle/frontend/composables/utils.ts`
- `.reference-repos/pokemantle/frontend/components/Share.vue`
- `.reference-repos/pokemantle/backend/app/main.py`

Best uses:

- Date-to-puzzle-number mapping
- Local storage of current puzzle attempts and stats
- Share text structure
- Server-side "guess result" endpoint shape if we later hide the answer

### 5. PokeRogue

Use PokeRogue as a behavioral reference for browser-game battle presentation and
ability architecture. Its code is AGPL, so do not copy implementation code into
this project unless we intentionally accept that licensing consequence. Rebuild
small equivalent logic ourselves.

Useful local reference files:

- `.reference-repos/pokerogue/src/data/abilities/init-abilities.ts`
- `.reference-repos/pokerogue/src/data/abilities/ab-attrs.ts`
- `.reference-repos/pokerogue/src/data/type.ts`
- `.reference-repos/pokerogue/src/data/status-effect.ts`
- `.reference-repos/pokerogue/src/data/moves/*`
- `.reference-repos/pokerogue/src/enums/*.ts`
- `.reference-repos/pokerogue/src/data/daily-seed/*`

Best uses:

- Ability-trigger abstraction ideas
- Battle log/event sequencing ideas
- Status/type enum naming ideas
- Daily seed and game-state flow inspiration

## Product Database Shape

Generate a compact database for the quiz instead of shipping raw source data.

Suggested normalized records:

```ts
type QuizPokemon = {
  id: number;
  slug: string;
  names: { en: string; ko?: string; ja?: string };
  types: PokemonType[];
  abilities: AbilityId[];
  baseStats: Record<StatId, number>;
  learnset: MoveId[];
  sprite: {
    icon?: string;
    front?: string;
    officialArtwork?: string;
  };
};

type QuizMove = {
  id: MoveId;
  name: string;
  type: PokemonType;
  category: "physical" | "special" | "status";
  ailment?: StatusId;
  statChanges?: Partial<Record<StatId, number>>;
  teachableProbe?: boolean;
};

type QuizAbility = {
  id: AbilityId;
  name: string;
  triggers: AbilityTrigger[];
};
```

## MVP Data Scope

Start with a curated subset rather than every Pokemon.

Initial scope:

- 30-50 Pokemon with interesting type, ability, and learnset signals
- 18 representative attack moves, one per type
- 5-7 status moves: Will-O-Wisp, Thunder Wave, Toxic, Spore/Sleep Powder,
  Confuse Ray or a similar non-volatile probe if desired
- 10-20 teachable move probes that split the candidate set well
- 10-15 abilities with visible quiz effects

Candidate early abilities:

- Speed Boost: after action, Speed +1
- Stamina: after damaging attack, Defense +1
- Defiant: after stat drop, Attack +2
- Guts: status boosts Attack and ignores burn attack reduction
- Contrary: stat changes invert
- Clear Body / White Smoke: prevents stat drops
- Water Absorb / Volt Absorb / Flash Fire: type interaction reveals immunity
- Levitate: Ground immunity

## Import Policy

1. Keep external repos under `.reference-repos/` only.
2. Keep generated quiz data under `src/data/generated/` once import scripts
   exist.
3. Keep handwritten curation under `src/data/curated/`.
4. Prefer build-time scripts over runtime API calls.
5. Record source commit hashes in generated data headers.

## Local Reference Repos

The following sparse clones are present for development convenience:

- `.reference-repos/pokemantle`
- `.reference-repos/pokerogue`
- `.reference-repos/pokemon-showdown`

They are intentionally ignored by Git.
