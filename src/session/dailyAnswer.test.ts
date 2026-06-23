// 데일리 정답 선정 검증 (ADR 검증: 데일리 결정론 / 전단사 분포 / 사이클 경계 결정론 / 타임존 클램프)
//
// 권위: docs/raw/feature/guess-feedback-contract/adr.md `## 검증` + prd.md `## 수용 기준`.
// 구현 표면: src/session/dailyAnswer.ts (dailyAnswer / normalizeGameDate).

import { describe, expect, it } from "vitest";
import { candidates } from "../data";
import { dailyAnswer, normalizeGameDate } from "./dailyAnswer";

const DAY_MS = 86_400_000;

/** epoch day index → 'YYYY-MM-DD'(UTC) — 테스트에서 연속 날짜를 만들기 위한 헬퍼. */
function gameDateAt(epochDay: number): string {
  return new Date(epochDay * DAY_MS).toISOString().slice(0, 10);
}

describe("dailyAnswer — 데일리 결정론", () => {
  it("같은 게임 날짜 → 같은 (candidate.id, ability.id) (반복 호출 동일)", () => {
    const gd = "2026-06-23";
    const a = dailyAnswer(gd);
    const b = dailyAnswer(gd);
    const c = dailyAnswer(gd);
    expect(a.candidate.id).toBe(b.candidate.id);
    expect(a.candidate.id).toBe(c.candidate.id);
    expect(a.ability.id).toBe(b.ability.id);
    expect(a.ability.id).toBe(c.ability.id);
  });

  it("선택된 ability는 그 candidate의 abilities에 실제 존재한다", () => {
    for (const gd of ["2026-01-01", "2026-04-04", "2027-12-31"]) {
      const secret = dailyAnswer(gd);
      const ids = secret.candidate.abilities.map((ab) => ab.id);
      expect(ids).toContain(secret.ability.id);
    }
  });
});

describe("dailyAnswer — 전단사 분포 (한 사이클 무중복)", () => {
  it("연속 N(=candidates.length)일이면 candidate가 충돌 없이 전부 1회씩 (distinct === N)", () => {
    const n = candidates.length;
    // 사이클 경계에 정렬: cycleIndex가 일정하도록 N의 배수 epoch day에서 시작.
    const start = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
    const cycleStart = Math.floor(start / n) * n;

    const seen = new Set<string>();
    for (let i = 0; i < n; i += 1) {
      const gd = gameDateAt(cycleStart + i);
      seen.add(dailyAnswer(gd).candidate.id);
    }
    // 전단사: N일 동안 각 후보가 정확히 한 번씩 → distinct count === N.
    expect(seen.size).toBe(n);
  });
});

describe("dailyAnswer — 사이클 경계 결정론", () => {
  // seededPermutation은 내부 함수(미export)라, dailyAnswer로 두 사이클 윈도우의
  // candidate 순열 전체를 복원해 '다른 시드 → 다른 순열'을 배열 비교로 구조 단언한다.
  // (1점 비교 dayN!==day0은 1/N 확률로 위양성 실패 → 전체 배열 비교로 우연 의존 제거.)
  /** [cycleStart, cycleStart+n) N일의 candidate.id 순열을 복원. */
  function cyclePermutation(cycleStart: number, n: number): string[] {
    return Array.from({ length: n }, (_, i) => dailyAnswer(gameDateAt(cycleStart + i)).candidate.id);
  }

  it("다른 사이클은 다른 순열(배열 전체가 동일하지 않음 — 최소 1 position 차이)", () => {
    const n = candidates.length;
    const start = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
    const cycle0Start = Math.floor(start / n) * n;

    const perm0 = cyclePermutation(cycle0Start, n); // [0,N)
    const perm1 = cyclePermutation(cycle0Start + n, n); // [N,2N) — 다음 사이클(다른 시드)

    // 두 순열 모두 전단사(각 후보 1회씩)임을 먼저 고정.
    expect(new Set(perm0).size).toBe(n);
    expect(new Set(perm1).size).toBe(n);

    // '다른 시드 → 다른 순열': position-by-position으로 완전 동일하지 않다.
    const differingPositions = perm0.filter((id, i) => id !== perm1[i]).length;
    expect(differingPositions).toBeGreaterThan(0);
  });

  it("같은 dayN 재호출은 동일 (사이클 간에도 결정론 유지)", () => {
    const n = candidates.length;
    const start = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
    const cycleStart = Math.floor(start / n) * n;
    const gd = gameDateAt(cycleStart + n);

    const first = dailyAnswer(gd);
    const second = dailyAnswer(gd);
    expect(second.candidate.id).toBe(first.candidate.id);
    expect(second.ability.id).toBe(first.ability.id);
  });

  it("다음 사이클도 전단사가 재성립(사이클마다 무중복 보장)", () => {
    const n = candidates.length;
    const start = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
    const cycle0Start = Math.floor(start / n) * n;
    const perm1 = cyclePermutation(cycle0Start + n, n);
    expect(new Set(perm1).size).toBe(n);
  });
});

describe("normalizeGameDate — 타임존 클램프 (min(local, utc))", () => {
  // 반사실 보조: 클램프 '없었다면' local 벽시계가 어느 게임 날짜였을지 단독 환산.
  // getTimezoneOffset 규약(UTC - local, 분) → local 벽시계 ms = utcMs - offset*60000.
  function localDateWithoutClamp(utcMs: number, tzOffsetMinutes: number): string {
    const localMs = utcMs - tzOffsetMinutes * 60_000;
    return new Date(Math.floor(localMs / DAY_MS) * DAY_MS).toISOString().slice(0, 10);
  }

  it("UTC offset 0이면 게임 날짜 = UTC 자정 앵커", () => {
    const utcMs = Date.UTC(2026, 5, 23, 22, 0, 0); // UTC 2026-06-23 22:00
    expect(normalizeGameDate(utcMs, 0)).toBe("2026-06-23");
  });

  it("기기 시계 앞당김(local이 다음날)이어도 min(local,utc)로 더 이른 UTC 날짜에 묶인다", () => {
    // KST(UTC+9, offset=-540): UTC 2026-06-23 22:00 → local 벽시계는 2026-06-24 07:00(다음날).
    // 클램프가 없으면 다음 정답을 선취. min(localDay, utcDay) → 더 이른 UTC 날짜.
    const utcMs = Date.UTC(2026, 5, 23, 22, 0, 0);
    // 반사실 단언: 클램프가 없었다면 local은 미래(2026-06-24)였다 — min이 미래를 묶었음을 구조로 입증.
    expect(localDateWithoutClamp(utcMs, -540)).toBe("2026-06-24");
    expect(normalizeGameDate(utcMs, -540)).toBe("2026-06-23"); // 클램프가 더 이른 UTC로 묶음
  });

  it("local이 UTC보다 더 이른 날(서반구)이면 더 이른 local 날짜로 묶인다", () => {
    // PST(UTC-8, offset=480): UTC 2026-06-23 02:00 → local은 2026-06-22 18:00(전날).
    const utcMs = Date.UTC(2026, 5, 23, 2, 0, 0);
    expect(normalizeGameDate(utcMs, 480)).toBe("2026-06-22");
  });

  it("같은 (now, tzOffset) 입력은 항상 같은 게임 날짜 (결정론)", () => {
    const utcMs = Date.UTC(2026, 5, 23, 12, 30, 0);
    expect(normalizeGameDate(utcMs, -540)).toBe(normalizeGameDate(utcMs, -540));
  });

  it("클램프는 미래 선취만 막는다: local 자정 직전이라도 utcDay보다 미래로 가지 않는다", () => {
    // UTC 2026-06-23 15:00, KST → local 2026-06-24 00:00 정각(다음날 자정).
    // 미래 선취 방지: 채택 날짜는 utcDay(2026-06-23)를 넘지 않는다.
    const utcMs = Date.UTC(2026, 5, 23, 15, 0, 0);
    const result = normalizeGameDate(utcMs, -540);
    expect(result).toBe("2026-06-23");
  });
});
