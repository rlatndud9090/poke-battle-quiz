// 추측/피드백 계약 — Clue-only provider 로컬 구현 (ADR 결정(1), CreateProvider의 v1 로컬판)
//
// 권위 출처:
//  - ADR `docs/raw/feature/guess-feedback-contract/adr.md` 결정(1): provider 경계·비노출 불변식.
//  - PRD 수용기준: 정답 비노출 불변식(provider 반환에 정답 식별자 부재, 해결 후 revealed로만 공개).
//
// 정답 Secret을 내부에서 dailyAnswer(gameDate)로 재유도해 클로저에 가둔다.
// 메서드 반환 어디에도 secret·candidate 객체·정답 식별자가 새지 않는다(해결 전).

import { entryClues as engineEntryClues, judge as engineJudge } from "../engine";
import type { Action, Clue } from "../engine";
import { dailyAnswer } from "./dailyAnswer";
import type { ActionResult, AnswerProvider, CreateProvider, GameDate, GuessResult } from "./types";

/**
 * v1 로컬 provider 팩토리 (= CreateProvider 시그니처). 정적·결정론(런타임 fetch 0).
 *
 * 내부에서 dailyAnswer(gameDate)로 Secret을 재유도해 클로저에 가둔다. 세션 reducer·UI는
 * 정답을 모르고, 미래 서버 승급은 같은 CreateProvider 시그니처의 어댑터 1개 교체로 끝난다.
 */
export const createProvider: CreateProvider = (gameDate: GameDate): AnswerProvider => {
  // 클로저에 가두는 정답. 어떤 메서드 반환에도 이 객체/식별자가 새지 않는다.
  const secret = dailyAnswer(gameDate);

  return {
    entryClues(): readonly Clue[] {
      return engineEntryClues(secret);
    },

    submitAction(action: Readonly<Action>): ActionResult {
      // 엔진 judge에만 secret을 넘기고, 반환은 단서(Clue[])만.
      return { clues: engineJudge(action, secret) };
    },

    submitGuess(candidateId: string): GuessResult {
      const correct = candidateId === secret.candidate.id;
      if (!correct) {
        // 오답: 식별자 일절 노출 없음(게임 계속).
        return { correct: false };
      }
      // 정답일 때만 공개 페이로드를 채운다.
      return {
        correct: true,
        revealed: {
          candidateId: secret.candidate.id,
          nameKo: secret.candidate.nameKo,
          abilityId: secret.ability.id,
        },
      };
    },
  };
};
