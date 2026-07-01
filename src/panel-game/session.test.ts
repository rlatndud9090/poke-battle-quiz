import { describe, expect, it } from "vitest";
import { getCandidate } from "../data";
import { getPanelReveal } from "./answer";
import { openPanel, submitGuess, toPanelGameView, createPanelSession } from "./session";
import type { PanelGameAnswer } from "./types";

function buildAnswer(candidateId: string, abilityId?: string): PanelGameAnswer {
  const candidate = getCandidate(candidateId)!;
  const ability = abilityId
    ? candidate.abilities.find((item) => item.id === abilityId)!
    : candidate.abilities[0];
  return { candidate, ability };
}

describe("패널 게임 세션", () => {
  it("패널을 처음 열면 점수가 1 증가한다", () => {
    const session = createPanelSession("2026-07-01");
    const next = openPanel(session, "fire");

    expect(next.moveCount).toBe(1);
    expect(next.openedPanels).toEqual(["fire"]);
  });

  it("같은 패널을 다시 열어도 점수가 늘지 않는다", () => {
    const session = openPanel(createPanelSession("2026-07-01"), "fire");
    const next = openPanel(session, "fire");

    expect(next.moveCount).toBe(1);
    expect(next.openedPanels).toEqual(["fire"]);
  });

  it("정답을 맞히면 해결 상태가 된다", () => {
    const answer = buildAnswer("pikachu");
    const session = createPanelSession("2026-07-01");
    const next = submitGuess(session, { candidateId: "pikachu", nameKo: "피카츄" }, answer);

    expect(next.status).toBe("해결");
    expect(next.moveCount).toBe(1);
    expect(next.guesses.at(-1)?.correct).toBe(true);
  });

  it("12회를 모두 쓰면 실패 상태가 된다", () => {
    const answer = buildAnswer("pikachu");
    let session = createPanelSession("2026-07-01");
    for (let index = 0; index < 11; index += 1) {
      session = openPanel(session, `panel-${index}` as never);
    }

    const failed = submitGuess(session, { candidateId: "bulbasaur", nameKo: "이상해씨" }, answer);

    expect(failed.moveCount).toBe(12);
    expect(failed.status).toBe("실패");
  });

  it("게임이 끝나면 reveal을 볼 수 있다", () => {
    const answer = buildAnswer("pikachu");
    const solved = submitGuess(createPanelSession("2026-07-01"), { candidateId: "pikachu", nameKo: "피카츄" }, answer);
    const view = toPanelGameView(solved, answer);

    expect(view.revealed).toEqual(getPanelReveal(answer));
  });
});
