---
title: "포켓몬 데이터 폼 누수·이름 충돌·캐시 키 수정"
date: "2026-06-18"
status: fixed # draft | review | fixed | rejected
approval:
unit_type: bugfix
---

# Bugfix: 포켓몬 데이터 폼 누수·이름 충돌·캐시 키 수정

PR #1(pokemon-data-contract) 머지 후 Codex 코드리뷰에서 제기된 P2 3건과,
그 과정에서 드러난 표시 이름 충돌을 함께 바로잡는다.

## 증상

- **gmax 누수:** `toxtricity-low-key-gmax`, `urshifu-rapid-strike-gmax` 2건이 후보에 포함됐다.
  거다이맥스는 타입/특성이 원종과 같아 추론 신호가 없는데도, 종 기본형과의 타입/특성 비교만으로는
  걸러지지 않았다.
- **표시 이름 충돌:** 타입이 서로 다른 폼들이 같은 이름으로 뭉개졌다.
  - 켄타로스 팔데아 3종(컴뱃/블레이즈/아쿠아, 타입 모두 다름)이 전부 `팔데아 켄타로스`.
  - 가라르 불비달마 standard(ice) vs zen(ice/fire)이 모두 `가라르 불비달마`.
  - 영어 표시명은 더 광범위하게 충돌(necrozma/calyrex/oricorio 서브폼이 전부 `Necrozma`/`Calyrex`/`Oricorio`).
- **캐시 stale 위험:** `.cache/pokedata`가 스냅샷 SHA로 구분되지 않아, 고정 SHA를 갱신해도
  옛 캐시를 재사용해 잘못된 데이터가 섞일 수 있었다.

## 영향

- 데이터 계약 소비자(배틀 엔진·추측/피드백·UI 후속 피처) 전부. 정답 후보에 비전투 외형 변종이
  섞이고, 같은 이름의 서로 다른 정답이 공존하면 이름 추측 퍼즐의 정답 식별이 무너진다.
- 산출물 `src/data/pokemon.json`, `src/data/meta.json`.

## 원인

- gmax/totem은 종 기본형이 아닌 "리전 기본형"과 타입이 같아도, 비교 기준이 종 기본형이라
  리전 totem(예: `raticate-totem-alola`)은 차이가 있는 것으로 잡혀 통과했다. → 슬러그 기반 명시 제외 부재.
- 이름 합성이 리전을 접두로만 붙이고(`팔데아 켄타로스`) 서브폼 식별자를 버렸다. 또 PokéAPI
  스냅샷이 일부 폼(켄타로스 팔데아 3종, `enamorus-therian`, `oinkologne-female` 등)의
  `form_names`를 누락해, 폼을 슬러그에서만 식별할 수 있는데 그 폴백이 없었다.
- 캐시 디렉터리가 SHA로 네임스페이스되지 않았다.

## 수정

`scripts/gen-pokemon-data.mjs`:

- **gmax·totem 제외:** variety 수집 단계에서 `-gmax`/`-totem` 슬러그를 직접 건너뛴다.
- **이름 규칙 재작성(`buildNames`):** `원종(리전/서브폼)` 간결 괄호 형식, **리전 먼저**.
  - 예: `켄타로스(팔데아/컴뱃종)`, `나인테일(알로라)`, `불비달마(가라르/달마모드)`, `춤추새(훌라훌라스타일)`.
  - 메가/원시/로토무 가전·울트라네크로즈마처럼 `form_names`가 원종명을 품은 "완성형"은 그대로 유지.
  - X/Y 메가(라이츄 등 Z-A 신규)는 슬러그에서 `X`/`Y` 접미를 살린다.
  - `form_names`가 없는 폼은 `SUBFORM_KO`/`SUBFORM_EN` 슬러그 매핑으로 공식 한국어명을 공급.
- **캐시 SHA 네임스페이스:** `CACHE_DIR = .cache/pokedata/{SHA}`.
- **표시 이름 유일성 가드:** `validateAll`에서 `nameKo` 중복 시 throw(폼 식별 불가 방지).

재생성 결과: 후보 1213 → **1209건**(원종 1023 + 폼 186; gmax 2 + totem 2 제외), `nameKo`/`nameEn` 중복 0.

> P1(메가 누수 의심)은 **무효**: 지적된 megas(raichu-mega-x/y 등)는 포켓몬 레전드 Z-A에서 추가된
> 실재 메가로, 최신 스냅샷이 정확히 반영한 것이다.

관련 문서: [PRD](../../feature/pokemon-data-contract/prd.md) · [ADR](../../feature/pokemon-data-contract/adr.md)

## 회귀 방지

- [x] `nameKo` 후보 전체 유일성 단위 테스트 추가(`src/data/pokemon.test.ts`).
- [x] gmax·totem 전수 제외 단위 테스트 추가.
- [x] 타입이 다른 폼의 구분 명명(켄타로스 팔데아 3종·가라르 불비달마·X/Y 메가) 단위 테스트 추가.
- [x] 모수 고정 기대값 갱신(1209 / 1023 / 186).
- [x] 생성기에 `nameKo` 중복 throw 가드 내장(빌드 타임 재발 차단).
