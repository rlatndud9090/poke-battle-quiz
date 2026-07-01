import { PANEL_MOVE_LIMIT } from "./types";
import type {
  PanelGameAnswer,
  PanelGameStatus,
  PanelGameView,
  PanelGuess,
  PanelId,
  PersistedPanelGame,
} from "./types";
import { getPanelReveal } from "./answer";

export const PANEL_GAME_VERSION = 1;

export function createPanelSession(gameDate: string): PersistedPanelGame {
  return {
    version: PANEL_GAME_VERSION,
    gameDate,
    openedPanels: [],
    guesses: [],
    moveCount: 0,
    status: "진행",
  };
}

export function openPanel(session: PersistedPanelGame, panelId: PanelId): PersistedPanelGame {
  if (session.status !== "진행") return session;
  if (session.openedPanels.includes(panelId)) return session;

  const moveCount = session.moveCount + 1;
  return {
    ...session,
    openedPanels: [...session.openedPanels, panelId],
    moveCount,
    status: resolveStatus(moveCount, false),
  };
}

export function submitGuess(
  session: PersistedPanelGame,
  guess: Omit<PanelGuess, "correct">,
  answer: PanelGameAnswer,
): PersistedPanelGame {
  if (session.status !== "진행") return session;

  const correct = guess.candidateId === answer.candidate.id;
  const moveCount = session.moveCount + 1;

  return {
    ...session,
    guesses: [...session.guesses, { ...guess, correct }],
    moveCount,
    status: correct ? "해결" : resolveStatus(moveCount, false),
  };
}

function resolveStatus(moveCount: number, solved: boolean): PanelGameStatus {
  if (solved) return "해결";
  if (moveCount >= PANEL_MOVE_LIMIT) return "실패";
  return "진행";
}

export function toPanelGameView(session: PersistedPanelGame, answer: PanelGameAnswer): PanelGameView {
  return {
    gameDate: session.gameDate,
    openedPanels: session.openedPanels,
    guesses: session.guesses,
    moveCount: session.moveCount,
    remainingMoves: Math.max(0, PANEL_MOVE_LIMIT - session.moveCount),
    status: session.status,
    revealed: session.status === "진행" ? undefined : getPanelReveal(answer),
  };
}
