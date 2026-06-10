---
name: commit-protocol
description: "Lore Commit Protocol에 따라 검증, 스테이징, 커밋 메시지 작성을 수행할 때 사용한다."
---

# Commit Protocol 어댑터

공용 기준은 `docs/harness/protocols/commit-protocol.md`와 `AGENTS.md`의
Lore Commit Protocol이다.

## 실행 순서

1. `npm run harness:gate`
2. `git status --short`
3. `git diff --stat`
4. 관련 파일만 명시적으로 `git add`
5. `git diff --cached --check`
6. Lore 형식 커밋 작성

`Related: docs/raw/<type>/<slug>/`와
`Co-authored-by: OmX <omx@oh-my-codex.dev>`를 누락하지 않는다.
