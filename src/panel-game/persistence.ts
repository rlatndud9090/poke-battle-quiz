import type { PersistedPanelGame } from "./types";
import { PANEL_GAME_VERSION, createPanelSession } from "./session";

const STORAGE_PREFIX = "panel-game:";
const memoryStore = new Map<string, string>();

function getStorage() {
  try {
    if (typeof window === "undefined") return null;
    const storage = window.localStorage;
    const key = `${STORAGE_PREFIX}probe`;
    storage.setItem(key, "1");
    storage.removeItem(key);
    return storage;
  } catch {
    return null;
  }
}

export function getPersistenceMode(): "localStorage" | "memory" {
  return getStorage() ? "localStorage" : "memory";
}

function getKey(gameDate: string) {
  return `${STORAGE_PREFIX}${gameDate}`;
}

export function loadPanelSession(gameDate: string): PersistedPanelGame {
  const storage = getStorage();
  const raw = storage ? storage.getItem(getKey(gameDate)) : memoryStore.get(getKey(gameDate)) ?? null;

  if (!raw) return createPanelSession(gameDate);

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedPanelGame>;
    if (
      parsed.version !== PANEL_GAME_VERSION ||
      parsed.gameDate !== gameDate ||
      !Array.isArray(parsed.openedPanels) ||
      !Array.isArray(parsed.guesses) ||
      typeof parsed.moveCount !== "number" ||
      (parsed.status !== "진행" && parsed.status !== "해결" && parsed.status !== "실패")
    ) {
      return createPanelSession(gameDate);
    }
    return {
      version: PANEL_GAME_VERSION,
      gameDate,
      openedPanels: parsed.openedPanels,
      guesses: parsed.guesses,
      moveCount: parsed.moveCount,
      status: parsed.status,
    };
  } catch {
    return createPanelSession(gameDate);
  }
}

export function savePanelSession(session: PersistedPanelGame) {
  const value = JSON.stringify(session);
  const storage = getStorage();
  if (storage) {
    storage.setItem(getKey(session.gameDate), value);
    return;
  }
  memoryStore.set(getKey(session.gameDate), value);
}
