---
title: "하네스 레포지토리 테라포밍"
date: "2026-06-12"
status: done # draft | done | rejected
approval:
unit_type: chore
---

# Chore: 하네스 레포지토리 테라포밍

## 맥락

이 저장소는 처음에는 특정 제품 앱을 만들기 위해 생성되었지만, 이후 대부분의
작업이 cross-agent LLM harness를 강화하는 방향으로 쌓였다. 형님은 앞으로 만들
여러 웹앱, 모바일앱, 게임 프로젝트에 공통으로 장착할 수 있는 하네스 셋을 원한다.

따라서 현재 저장소를 제품 코드 저장소가 아니라 reusable harness 저장소로
테라포밍한다. 소비 프로젝트는 별도 저장소에서 자기 제품 코드와 자기 raw/wiki를
가진다.

## 범위

- 범위에 포함: 제품 앱 파일 제거, package metadata 범용화, README/AGENTS/wiki
  정체성 변경, 하네스 프로토콜/역할/어댑터의 도메인 특수성 제거, 검증 스크립트
  범용화.
- 범위에서 제외: 원격 GitHub repository rename, 배포 방식 결정, 소비 프로젝트
  생성, 하네스 설치 CLI 구현.

## 결정

- 이 저장소의 현재 HEAD는 앱 실행 표면이 아니라 `docs/harness`, `.codex`,
  `.claude`, `scripts/harness` 중심의 공통 하네스 패키지로 유지한다.
- 소비 프로젝트의 도메인 특수성은 해당 프로젝트의 `AGENTS.md`, PRD, ADR, raw/wiki에
  둔다.
- 기존 제품 앱 bootstrap raw와 React/Vite 앱 파일은 현재 하네스 저장소 표면에서
  제거한다.
- `harness:gate`의 build 단계는 앱 번들이 아니라 하네스 Node 스크립트 문법 검증으로
  바꾼다.

## 검증

- `npm run harness:ingest -- docs/raw/chore/harness-repository-terraform`
- `npm run harness:check`
- `npm run lint`
- `npm run build`
- `npm run test:run` (`--passWithNoTests`, 현재 테스트 파일 없음)
- `npm run harness:gate`
