---
name: raw-start
description: "확정된 branch-sized work unit의 raw directory와 템플릿을 생성할 때 사용한다."
---

# Raw Start 어댑터

공용 기준은 `docs/harness/protocols/raw-start.md`다.

```sh
npm run harness:start -- --title "<한국어 제목>"
```

현재 브랜치가 유효하지 않거나 `main`이면 `--type`, `--slug`를 명시한다.
작업 단위가 아직 확정되지 않았으면 먼저 `work-intake`를 사용한다.
