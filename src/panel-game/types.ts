import type { Ability, Candidate, PokemonType } from "../data";

export const PANEL_MOVE_LIMIT = 12;

export type GameDate = string;

export type TitleAvailabilityKey = "swsh" | "la" | "sv" | "za";

export type StaticPanelId =
  | "low-kick"
  | "beast-boost"
  | "eviolite"
  | "mega-stone"
  | "gmax"
  | "title-swsh"
  | "title-la"
  | "title-sv"
  | "title-za";

export type PanelId = PokemonType | StaticPanelId;

export type PanelGameStatus = "진행" | "해결" | "실패";

export interface PanelMetadata {
  candidateId: string;
  eligible: boolean;
  eligibilityReason: string;
  lowKickPower: 20 | 40 | 60 | 80 | 100 | 120;
  beastBoost: string;
  evioliteEligible: boolean;
  hasMegaEvolution: boolean;
  hasGigantamax: boolean;
  titleAvailability: Record<TitleAvailabilityKey, boolean>;
}

export interface PanelGameAnswer {
  candidate: Candidate;
  ability: Ability;
}

export interface PanelGuess {
  candidateId: string;
  nameKo: string;
  correct: boolean;
}

export interface PersistedPanelGame {
  version: number;
  gameDate: GameDate;
  openedPanels: PanelId[];
  guesses: PanelGuess[];
  moveCount: number;
  status: PanelGameStatus;
}

export interface PanelReveal {
  candidateId: string;
  nameKo: string;
  abilityId: string;
  types: readonly PokemonType[];
}

export interface PanelGameView {
  gameDate: GameDate;
  openedPanels: PanelId[];
  guesses: PanelGuess[];
  moveCount: number;
  remainingMoves: number;
  status: PanelGameStatus;
  revealed?: PanelReveal;
}
