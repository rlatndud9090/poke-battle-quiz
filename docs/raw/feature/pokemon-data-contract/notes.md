# Notes: 포켓몬 데이터 계약(타입 상성표 · 종족→특성 매핑) 정의 및 전 세대 시드

Date: 2026-06-17 Asia/Seoul
Unit type: feature
Status: draft

## 맥락

- 게임의 배틀 엔진·UI·정답 판정이 모두 "포켓몬을 어떤 데이터 모양으로 표현하나"에
  의존하는데 공유 스키마가 없다. 이 피처가 그 토대(18타입 상성표 + 종족→가능특성
  매핑 + 이름)를 정의한다.
- **2026-06-17 형님 결정:** 1세대 151종 한정 폐기 → 현존 전 세대 모든 종(~1025,
  PokéAPI species `count` 실측 1025) 대상. 데이터는 외부 공개 소스에서 자동 수집.

## 조사 결론 (전종 + 외부 자동수집 전제)

### 데이터 소스
- **1차 소스 = PokéAPI.** 라이브 대량 호출(전종 pokemon+species ≈ 2050회)은 fair-use
  위반 소지 → `PokeAPI/api-data` GitHub 정적 덤프(sparse/shallow clone)에서 수집 권장.
  REST에 하드 rate limit은 없으나 "받은 리소스 로컬 캐시 필수·대량호출 자제·DoS성 IP 밴"
  정책. 따라서 수집은 빌드 1회로 끝내야 정석.
- **한국어(ko) 이름:** PokéAPI `pokemon-species`의 `names`에 ko 제공(피카츄="피카츄" 실측,
  종당 ~11개 언어). Showdown/Smogon/veekun엔 ko 없음 → **ko는 PokéAPI 단일 소스 종속.**
- **18타입 상성표:** PokéAPI `type`의 `damage_relations` = Bulbapedia 일치(교차검증 완료).
  Showdown `typechart`의 `damageTaken` 정수코드(0=등배 / 1=효과적2× / 2=반감0.5× / 3=무효0×)로
  2차 검증 가능.
- **주의:** PokéAPI `type` 목록엔 18 배틀타입 외 `stellar`/`unknown`도 있음 → 18타입만
  화이트리스트.

### 스키마 (reference 차용)
- **typechart:** `{ [defType]: { [atkType]: number } }` 18타입 한 방향(배수 0/0.5/1/2).
  Showdown `data/typechart.ts` 구조 차용, 상태이상/세대mod/HPivs 키 제거. "방어자 행 기준"
  한 방향만 저장하고 배수 변환·복합타입 합산은 순수 함수 한 곳에.
- **species:** `{ num, en, types[1..2], abilities: {0, 1?, H?} }`. Showdown
  `SpeciesAbility {0,1?,H?,S?}`(0/1=일반, H=숨은, S=이벤트) 슬롯 차용 — S(이벤트)는 제외.
  슬롯명으로 일반/숨은을 표현하므로 별도 boolean 불필요.
- **names:** `{ [id|en]: { en, ko } }` 평탄 매핑(pokemantle `name_map` 패턴).
- 세대는 도감번호(num) 범위에서 파생 가능(Showdown `dex-species.ts` 343–361행 패턴).
  저장 vs 파생은 결정 포인트(열린 질문).
- 메가/거대화/지역폼은 `baseSpecies`/`forme`로 필터해 본종 우선(폼 별도 엔트리는 후속).

### 피할 과한 복잡성
- pokemantle식 `against_*` 18컬럼 종족별 사전계산(비정규화), 60+ 필드 와이드 테이블,
  전투 콜백/rating/flags, learnset/move/item, 세대별 mod, HPivs/상태이상 상성 키,
  지역폼 boolean 플래그 난립, CSV+백엔드 의존 — 모두 제외. 우리 계약은
  상성표 1개 + 종족 타입/특성 + 이름이면 충분(파생값은 런타임 계산).

### 번들 크기 (실측 시뮬레이션)
- trim 스키마 전종(~1025) JSON 원본 ~165–225KB, **gzip ~18–26KB**(타입·특성 슬러그 반복으로
  ~9.5× 압축). 18×18 타입표 원본 ~3.6KB(gzip ~0.6KB). 정적 SPA 초기 로드 부담 없음.

### 라이선스
- api-data **BSD-3-Clause**, Showdown **MIT**, sprites **CC0**. 포켓몬 명칭·디자인 IP는
  Nintendo / Game Freak / The Pokémon Company. **비공식 팬·비상업** 유지, 출처·라이선스 표기.
  루트 README에 이미 IP 고지/출처 섹션 존재 → 본 피처에서 구체 라이선스 명기.

## 결정 (확정)

- 대상: **전 세대 전종(~1025).**
- 1차 소스: **PokéAPI**(api-data 덤프), ko는 PokéAPI 종속.
- 생성: **빌드타임 정적 JSON 커밋**(런타임 외부 fetch 아님) → 데일리 결정론·치팅방지·오프라인·
  rate-limit 회피.
- 위는 후속 모든 피처가 의존하는 durable decision → ADR로 기록(adr.md).

## 검증

- `npm run harness:gate` (check / lint / build / test:run).
- vitest: 타입 상성 알려진 케이스, 전종 스키마 검증, 조회 헬퍼 기대값.

## 후속 작업

- ADR 작성($adr-helper): 데이터 소스 / 생성 시점 / 타입표 권위 출처 / ko 단일 종속.
- 후속 피처: `battle-judgment-engine` → `guess-feedback-contract-adr` → `battle-turn-ui`.

## 조사 출처

### 외부 데이터 소스 (웹)
- PokéAPI v2 공식 문서(엔드포인트/fair-use): https://pokeapi.co/docs/v2
- PokéAPI About(정적 호스팅·rate limit 폐지·캐시 정책): https://pokeapi.co/about
- pokemon-species/25 실측(ko=피카츄, generation-i): https://pokeapi.co/api/v2/pokemon-species/25/
- species count 실측 = 1025: https://pokeapi.co/api/v2/pokemon-species/?limit=0
- type 목록(18 배틀타입 + stellar/unknown): https://pokeapi.co/api/v2/type/
- type/4(poison) damage_relations(Bulbapedia 일치): https://pokeapi.co/api/v2/type/4/
- PokeAPI/api-data 정적 덤프 레포: https://github.com/PokeAPI/api-data
- api-data LICENSE(BSD-3-Clause): https://github.com/PokeAPI/api-data/blob/master/LICENSE.txt
- api-data pikachu species index.json(ko 포함): https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/pokemon-species/25/index.json
- PokeAPI rate limit 이슈 #282: https://github.com/PokeAPI/pokeapi/issues/282
- 비영문 이름 조회 불가 이슈 #235/#236: https://github.com/PokeAPI/pokeapi/issues/236
- sprites 라이선스(CC0): https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt
- PokeAPI 본 레포 LICENSE(Nintendo 상표 고지): https://github.com/PokeAPI/pokeapi/blob/master/LICENSE.md
- smogon/pokemon-showdown(MIT, typechart damageTaken 인코딩): https://github.com/smogon/pokemon-showdown
- @pkmn/dex(Showdown 데이터 타입 래퍼, getEffectiveness): https://www.npmjs.com/package/@pkmn/dex
- Bulbapedia Type(18타입 상성표 권위 출처): https://bulbapedia.bulbagarden.net/wiki/Type

### Reference repos (로컬)
- Showdown 타입상성표: `pokemon-showdown/data/typechart.ts`
- Showdown 상성 해석 로직 getEffectiveness/getImmunity: `pokemon-showdown/sim/dex.ts`
- Showdown TypeData 스키마(damageTaken): `pokemon-showdown/sim/dex-data.ts`
- Showdown 종족 데이터(num/types/abilities 슬롯/forme): `pokemon-showdown/data/pokedex.ts`
- Showdown SpeciesAbility {0,1,H,S} + num→gen 파생: `pokemon-showdown/sim/dex-species.ts`
- Showdown 특성 데이터(전투 콜백/rating — 대부분 버림): `pokemon-showdown/data/abilities.ts`
- Showdown 이름 텍스트(영어 단일, ko 없음): `pokemon-showdown/data/text/pokedex.ts`
- pokemantle 종족 모델(와이드 60+필드, against_* 사전계산 — 회피): `pokemantle/backend/app/models.py`
- pokemantle 데이터 출처/라이선스(Kaggle CSV CC BY-SA 4.0): `pokemantle/README.md`
- pokemantle 피처 벡터화(차용 대상 아님): `pokemantle/backend/app/poke2vec.py`
