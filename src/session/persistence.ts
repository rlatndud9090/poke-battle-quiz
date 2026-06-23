// 추측/피드백 계약 — 영속 어댑터 (ADR 결정(3): PersistenceAdapter 뒤 localStorage + 메모리 mock)
//
// 권위 출처:
//  - ADR `docs/raw/feature/guess-feedback-contract/adr.md` 결정(3): 키 규약(GameDate별 1세션)·version 폐기.
//  - PRD 수용기준: 영속 복원(같은 날짜 세션 복원, 정답은 저장 없이 재유도) / 순수성(I/O 격리).
//
// 도메인 코어는 PersistenceAdapter를 주입받아 localStorage·메모리 mock·서버 KV를 교체해도 불변.

import { PERSISTED_VERSION } from "./session";
import type { GameDate, PersistedSession, PersistenceAdapter } from "./types";

/** localStorage 키 규약 = GameDate별 1세션. */
const KEY_PREFIX = "pbq:session:";

function storageKey(gameDate: GameDate): string {
  return `${KEY_PREFIX}${gameDate}`;
}

/**
 * 역직렬화된 값이 유효한 PersistedSession인지 검사(런타임 신뢰 경계).
 * version 불일치/미래값이면 폐기한다(데일리 결정론이 정답을 재유도하므로 무손실).
 */
function isValidPersisted(value: unknown): value is PersistedSession {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  // version 불일치/미래값이면 폐기.
  if (candidate.version !== PERSISTED_VERSION) return false;
  if (typeof candidate.gameDate !== "string") return false;
  if (!Array.isArray(candidate.clueLog)) return false;
  if (typeof candidate.moveCount !== "number") return false;
  if (candidate.status !== "진행" && candidate.status !== "해결") return false;
  return true;
}

/**
 * v1 기본 영속 구현 = localStorage. SSR/비브라우저/접근 차단 환경에서는 안전하게 no-op(메모리 없음).
 * load 시 version 불일치/미래값·파싱 실패는 폐기(null 반환)해 새 세션을 시작하게 한다.
 */
export function createLocalStoragePersistence(): PersistenceAdapter {
  const store: Storage | null = typeof localStorage !== "undefined" ? localStorage : null;

  return {
    load(gameDate: GameDate): PersistedSession | null {
      if (store === null) return null;
      let raw: string | null;
      try {
        raw = store.getItem(storageKey(gameDate));
      } catch {
        return null;
      }
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return isValidPersisted(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },

    save(session: PersistedSession): void {
      if (store === null) return;
      try {
        store.setItem(storageKey(session.gameDate), JSON.stringify(session));
      } catch {
        // 쿼터 초과·접근 차단은 조용히 무시(도메인 진행을 막지 않는다).
      }
    },
  };
}

/**
 * 테스트용 메모리 mock 어댑터. localStorage 의존 없이 같은 version 정책(폐기)을 적용한다.
 */
export function createMemoryPersistence(): PersistenceAdapter {
  const map = new Map<GameDate, string>();

  return {
    load(gameDate: GameDate): PersistedSession | null {
      const raw = map.get(gameDate);
      if (raw === undefined) return null;
      const parsed: unknown = JSON.parse(raw);
      return isValidPersisted(parsed) ? parsed : null;
    },

    save(session: PersistedSession): void {
      // localStorage와 동형으로 직렬화 라운드트립을 거쳐 비노출/불변을 동일 검증.
      map.set(session.gameDate, JSON.stringify(session));
    },
  };
}
