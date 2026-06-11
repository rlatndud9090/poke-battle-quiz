---
title: "하네스 메타 정책"
date: "2026-06-11"
status: done # draft | done | rejected
approval: "user:2026-06-11:하네스는 제품 PRD/ADR 자동구현 레일 밖의 개발자 운영 구조로 관리"
unit_type: chore
---

# Chore: 하네스 메타 정책

## 맥락

형님은 하네스 변경을 제품 요구사항, 기획, 명세와 같은 PRD/ADR 기반 AI 자동구현
시스템에 넣지 않겠다고 정했다. 하네스는 제품 자체가 아니라 개발자와 에이전트가
작업하기 위한 운영 구조이므로, 제품 PRD/ADR 레일에 넣으면 자기참조가 과해지고
작업 단위가 불필요하게 무거워진다.

## 범위

- 포함: 하네스 변경의 raw/commit/검증 정책 정리.
- 포함: `$do-next`, `$ralplan`, `$ralph` 기반 제품 구현 레일에서 developer-only
  하네스 변경을 제외한다는 문서화.
- 제외: 제품 기능, 도메인 구조, UI, 데이터 계약 변경.
- 제외: 이미 작성된 과거 하네스 PRD/ADR의 이력 재작성.

## 결정

- developer-only 하네스 변경은 제품 PRD/ADR 자동구현 레일에 넣지 않는다.
- 하네스 변경은 `chore` raw Notes, wiki ingest, `harness:gate`, Lore commit으로 추적한다.
- 하네스 변경이 제품/도메인 architecture 결정까지 포함할 때만 별도 PRD/ADR을 검토한다.
- `$do-next`는 제품/도메인 작업 단위 확정용으로 유지하고, 하네스 변경의 기본
  진입점으로 쓰지 않는다.

## 검증

- `npm run harness:gate`
