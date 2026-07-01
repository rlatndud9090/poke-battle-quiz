---
title: "하네스 서브모듈 최신화"
date: "2026-07-01"
status: done # draft | done | rejected
approval: "user:2026-07-01:하네스 서브모듈 최신화 후 main 푸시 및 작업 브랜치 리베이스 요청"
unit_type: chore
---

# Chore: 하네스 서브모듈 최신화

## 맥락

공용 LLM Project Harness 서브모듈에 새 규칙과 어댑터 변경이 들어와, 소비 프로젝트가
최신 하네스 기준으로 동작하도록 `.harness` submodule pointer를 최신 `origin/main`
커밋으로 올릴 필요가 있었다. 이번 작업은 제품 기능 변경이 아니라 하네스 공용 규칙
동기화에 해당한다.

## 범위

- 포함
  - `.harness` submodule pointer를 `e99a24e`에서 `80da6ef`로 업데이트
  - `attach-submodule.mjs` 재실행으로 adapter surface 정합성 재확인
  - `npm run harness:gate`로 하네스/린트/빌드/테스트 검증
- 제외
  - 소비 프로젝트의 제품 요구사항, PRD/ADR 본문, 앱 동작 변경
  - 새 하네스 기능을 사용하는 후속 구현 작업

## 결정

- 하네스 최신 커밋 `80da6ef`를 소비 프로젝트의 새 pin으로 채택한다.
- attach 재실행 결과, 프로젝트 override나 adapter 링크 추가 변경은 없었고 기존 구조를 그대로 유지했다.

## 검증

- `git submodule update --remote .harness`
- `node .harness/scripts/harness/attach-submodule.mjs --harness-dir .harness`
- `npm run harness:gate`
- submodule diff: `e99a24e..80da6ef`
  - `Add ClaudeCode FleetView title and result conventions to stage skills`
  - `Prefer runtime structured question tools before plain-text fallback`
