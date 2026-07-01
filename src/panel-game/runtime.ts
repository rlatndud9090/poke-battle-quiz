import { normalizeGameDate } from "../session/dailyAnswer";
import { getPersistenceMode, loadPanelSession, savePanelSession } from "./persistence";
import { selectPanelAnswer } from "./answer";

export function createPanelGameRuntime(now?: number, tzOffsetMinutes?: number) {
  const gameDate = normalizeGameDate(now, tzOffsetMinutes);
  const answer = selectPanelAnswer(gameDate);
  const session = loadPanelSession(gameDate);

  return {
    answer,
    session,
    persistenceMode: getPersistenceMode(),
    persist(nextSession = session) {
      savePanelSession(nextSession);
    },
  };
}
