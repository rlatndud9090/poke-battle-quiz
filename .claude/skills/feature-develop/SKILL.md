---
name: feature-develop
description: "기능 개발 워크플로우. PRD/ADR 기반 구현, 기능 재작업, 부분 수정 요청 시 사용한다. 공용 기준은 docs/harness/protocols/feature-develop.md다."
---

# Feature Develop 어댑터

ClaudeCode는 독자 규칙을 만들지 않고 공용 하네스를 따른다.

## 실행 순서

1. `AGENTS.md`를 읽는다.
2. `docs/wiki/index.md`를 읽는다.
3. `docs/harness/protocols/feature-develop.md`를 읽는다.
4. 현재 브랜치의 `docs/raw/feature/<slug>/prd.md`와 `adr.md`를 읽는다.
5. `docs/harness/roles/architect.md`를 기준으로 설계한다.
6. 구현은 `domain-engineer`, `ui-engineer`, `test-engineer` 역할 기준으로 나눈다.
7. 완료 전 `docs/harness/roles/integrator.md`와 `integration-gate.md`를 따른다.

모든 새 프로젝트 문서는 한국어로 작성한다.
