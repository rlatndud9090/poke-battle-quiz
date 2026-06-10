---
title: "하네스 강도와 한국어 원칙 보강"
date: "2026-06-10"
status: draft # draft | done | rejected
unit_type: chore
---

# Chore: 하네스 강도와 한국어 원칙 보강

## 맥락

초기 cross-agent harness는 Codex/ClaudeCode 공용 구조와 실행 스크립트는
갖췄지만, `html-editor-fe`의 하네스에 비해 역할 프롬프트와 프로토콜의
강도가 낮았다. 또한 PRD와 하네스 문서가 영어로 작성되어, 한국어로 논의하는
프로젝트 운영 방식과 맞지 않았다.

## 범위

- 범위에 포함: `docs/harness` 프로토콜/역할 문서의 한국어화와 강도 보강,
  `.claude`/`.codex` 어댑터 한국어화, raw 템플릿 한국어화, 언어 정책 명시.
- 범위에서 제외: Tiptap, 메일 HTML 호환성, 사내 이슈/PR/commitlint 규칙,
  메일 에디터 전용 CSS 검증 전략.

## 결정

- 하네스 강도는 `html-editor-fe`처럼 역할별 담당/미담당, 중요성, 성공 기준,
  제약, 실행 절차, 실패 모드, 출력 형식, 체크리스트를 갖는 수준으로 맞춘다.
- 도메인 특수성은 포켓몬 퀴즈 플랫폼에 맞춘다. 핵심 경계는 quiz platform,
  deterministic hint engine, ability trigger/effect, React UI shell이다.
- 프로젝트 작성 문서는 한국어 기본으로 한다. code identifier, branch name,
  command, file path처럼 기계적 식별자는 영어를 허용한다.

## 검증

- `npm run harness:gate`
