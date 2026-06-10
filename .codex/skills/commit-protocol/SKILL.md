---
name: commit-protocol
description: "Lore Commit Protocol에 따라 검증, 스테이징, 커밋 메시지 작성을 수행할 때 사용한다."
---

# Commit Protocol 어댑터

공용 기준:

1. `docs/harness/protocols/commit-protocol.md`
2. `AGENTS.md`의 Lore Commit Protocol

필수 순서:

```sh
npm run harness:gate
git status --short
git diff --cached --check
```

관련 파일만 stage하고, `Related:` raw path와 OmX co-author trailer를 포함한다.
