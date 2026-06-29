# Notes: 하네스 최신화 및 wiki taxonomy 개정

Date: 2026-06-29 Asia/Seoul
Unit type: chore
Status: draft

## 맥락

- 하네스 submodule이 wiki index 규칙을 업데이트했다. 핵심 변경은 feature raw unit을
  `Product & Architecture` 같은 broad bucket에 몰아넣지 않고, 프로젝트가 직접
  세부 taxonomy를 키우도록 강제하는 것이다.
- 이 프로젝트의 `docs/wiki/index.md`는 기존 broad bucket 구조와 오래된 안내 문구를
  유지하고 있어 최신 `wiki-ingest` 규칙과 어긋났다.
- 소비 프로젝트의 `docs/wiki/`는 프로젝트 소유이므로, submodule 포인터만 올리는
  것으로는 wiki가 새 규칙에 맞게 바뀌지 않는다.

## 결정

- `.harness` submodule을 최신 커밋으로 갱신하고 attach를 재실행한다.
- `docs/wiki/index.md`를 최신 wiki template 방향에 맞춰 얇은 navigation index 형식으로
  개정한다.
- feature 카테고리는 broad bucket 대신 `데이터 파이프라인`, `배틀 판정 규칙`,
  `데일리 게임 루프`로 재분류하고, 운영성 문서는 `프로젝트 운영`으로 둔다.
- 메인 리포의 검증이 로컬 scratch worktree에 흔들리지 않도록, Vitest 수집 대상에서
  `.claude/worktrees/**`를 제외한다.

## 검증

- `npm run harness:check`
- `npm run harness:gate`
  - `harness:check`, `lint`, `build`, `test:run`까지 통과했다.
  - `test:run`이 로컬 `.claude/worktrees/`를 수집하지 않도록 `vite.config.ts`의
    Vitest exclude를 함께 정리했다.

## 후속 작업

- 새 feature raw unit 추가 시 `npm run harness:ingest -- docs/raw/<type>/<slug> --category "<분류>"`를 사용한다.
- 로컬 worktree 운영 규칙이 더 생기면 `.gitignore`나 툴 설정과 함께 계속 맞춘다.
