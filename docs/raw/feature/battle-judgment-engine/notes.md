# Notes: 배틀 판정 엔진

Date: 2026-06-18 Asia/Seoul
Unit type: feature
Status: draft

> 이 문서는 `battle-judgment-engine` PRD/ADR을 뒷받침하는 **특성(ability) 전수 분석**이다.
> 우리 데이터셋에 실제 존재하는 **고유 특성 308종**을, Pokémon Showdown 핸들러 훅을 근거로
> 이 게임의 단서 모델(아래 택소노미 C1~C8)에 분류했다. 결론은 PRD 요구사항/비목표와 ADR 선택지에 반영한다.

---

## 맥락

### 분석 모수

- **후보(candidate) 수**: 1209건 (전 세대 + 폼, `src/data/pokemon.json`).
- **고유 특성 수**: **308종** (각 candidate `.abilities[].id` 중복 제거).
- candidate 1건은 특성 최대 3개(일반 2 + 숨겨진 1)를 가질 수 있어, "보유 candidate 합"의 카테고리 총합은 1209를 초과한다 — 이는 정상이며 "이 특성을 가진 candidate 수"의 단순 합이다.

### 출처

- **메커니즘 근거**: Pokémon Showdown (`smogon/pokemon-showdown`)의 `data/abilities.ts` (로컬 레퍼런스 스냅샷, 318개 특성 블록 파싱).
  - 우리 308종 전부 showdown 블록과 매칭됨(매칭 실패 0건). 매칭 키는 우리 id에서 하이픈 제거(`swift-swim`→`swiftswim`).
  - 발동 시점은 각 특성의 핸들러 훅(`onTryHit`, `onSourceModifyAtk/SpA`, `onSourceModifyDamage`, `onModifyAtk/SpA`, `onBasePower`, `onModifyType`, `onDamagingHit`, `onStart`, `onTryBoost`, `onImmunity` 등)으로 판별.
- **데이터 출처**: `src/data/pokemon.json` (worktree `bugfix/pokemon-data-form-fixes`).
- **특성 공식 한국어명 출처**: 데이터 계약과 동일한 고정 SHA PokéAPI api-data(`652ba55…`)의 `ability/<id>/index.json` → `names[language=ko]`. 308종 전부 ko명 존재(누락 0). 이 표들의 `한국어명` 열은 이 공식명을 따른다(임의 번역 아님).
- 보조 레퍼런스 pokerogue 존재하나 1차 근거는 showdown.

### 게임 단서 모델 (분류 기준의 근거)

- 유저 행동(action) = **공격 타입 + 물리/특수 분류** (예: "불 타입 물리").
- 엔진 `judge(action, secret)` = **순수 단발 판정**(턴 누적 없음). 출력 단서:
  - **데미지 배율**: x0.25 / 0.5 / 1 / 2 / 4 (실제 곱 그대로 노출).
  - **무효는 x0 단일 신호로 통합**: 타입 면역(땅→비행)과 특성 면역(부유 등)을 구분 없이 x0로 표기 → 유저가 추론.
  - **능력 랭크 변화**(-6~+6 델타) 단서.
- 신규 메커닉 후보: 정답이 가진 "내가 공격할 때 발동하는 특성"(C5)을 단서화하려면 **정답 포켓몬도 행동(공격)하게** 만들어야 함.

### 택소노미 정의

| 코드 | 정의 | 관측 조건 |
|---|---|---|
| **C1** | DEF-타입 면역/흡수 → **x0** (특성면역, 타입면역과 통합) | 유저 공격만으로 관측 |
| **C2** | DEF-배율 보정(무효 아님, 비정상 배율) | 유저 공격만으로 관측 |
| **C3** | DEF-피격시 랭크 변화 단서(델타) | 유저 공격만으로 관측 |
| **C4** | DEF-등장시 랭크/표식 단서 | 별도 "등장 이벤트" 필요 |
| **C5** | ATK-정답이 공격자일 때 발동 | "정답이 행동" 메커닉 필요 |
| **C6** | 접촉/상태 응징(상태이상 부여) | 상태 모델 필요 |
| **C7** | 날씨/필드/지형 생성·연동 | 광역 모델 필요(v1 범위 밖) |
| **C8** | 비관측/모델밖(스탯·유틸·상태 면역 등) | 단발 타입·배율·랭크 단서 아님 |

> 한 특성이 둘 이상 걸치면 **주 카테고리 + 부카테고리(부:Cx)**로 표기. 예: `dry-skin` = C1(물 무효) + 부C2(불 약점).

---

## 결정 (분석 결론)

### 카테고리별 집계표

| 카테고리 | 특성 수 | 보유 candidate 합 | "유저 공격"만으로 관측? | v1 권장 |
|---|---|---|---|---|
| **C1** DEF 면역/흡수(x0) | 12 | 173 | 예 | v1 코어 |
| **C2** DEF 배율 보정 | 14 | 69 | 예 | v1 코어 |
| **C3** DEF 피격시 랭크 | 20 | 109 | 예 | v1 또는 v1.1 (랭크 채널 추가시) |
| **C4** DEF 등장시 단서 | 12 | 116 | 아니오 (등장 이벤트 필요) | 확장 (등장 단서 도입시) |
| **C5** ATK 공격시 발동 | 52 | 497 | 아니오 (정답 행동 필요) | 확장 (상대 행동 메커닉 도입시) |
| **C6** 접촉/상태 응징 | 15 | 152 | 아니오 (상태 모델 필요) | 확장 |
| **C7** 날씨/필드/지형 | 19 | 66 | 아니오 (광역 모델 필요) | 범위 밖 |
| **C8** 비관측/모델밖 | 164 | 1521 | 아니오 | 비대상 |
| **합계** | **308** | — | — | — |

핵심 관찰:
- **C1+C2(26종)** 만으로 "유저가 공격하면 배율에 자연히 실리는" 모든 특성을 덮는다. 별도 단서 채널·메커닉 없이 **기존 데미지 배율 출력에 그대로 흡수**된다 → 가장 작은 코어.
- C1의 보유 합 173은 `levitate`(41) 단일 기여가 크다. C1 12종 중 8종은 부카테고리 C3(유인계 흡수 후 랭크업)도 가진다 — 흡수만 구현하면 x0, 랭크까지 구현하면 추가 단서.
- C5(52종/497)는 보유 합이 가장 큰 버킷이지만 **정답이 공격해야** 관측된다 — v1 단발 판정 모델로는 불가. 신규 메커닉의 핵심 후보.

### C1 — DEF 타입 면역/흡수 (x0 통합) · 12종

| id | 한국어명 | 보유 | 메커니즘 | 근거 훅 |
|---|---|---|---|---|
| `levitate` | 부유 | 41 | 땅 타입 무효(접지 면역) | onImmunity(ground)/타입차트 |
| `water-absorb` | 저수 | 28 | 물 타입 무효+회복 | onTryHit(type===Water) |
| `flash-fire` | 타오르는불꽃 | 27 | 불 타입 무효(+자기 불 강화는 C5 성격=정답 공격 시 발동→v1 비관측, 순수 x0) | onTryHit(type===Fire) |
| `sap-sipper` (부:C3) | 초식 | 21 | 풀 타입 무효 +공격1랭크 | onTryHit(Grass)+onTryBoost |
| `lightning-rod` (부:C3) | 피뢰침 | 19 | 전기 무효 +특공1랭크(유인) | onTryHit(Electric)+onTryBoost |
| `volt-absorb` | 축전 | 13 | 전기 타입 무효+회복 | onTryHit(type===Electric) |
| `storm-drain` (부:C3) | 마중물 | 8 | 물 무효 +특공1랭크(유인) | onTryHit(Water)+onTryBoost |
| `dry-skin` (부:C2) | 건조피부 | 7 | 물 무효+회복, 불 피해1.25x | onTryHit(Water)+onSourceModifyDamage(Fire) |
| `motor-drive` (부:C3) | 전기엔진 | 4 | 전기 무효 +스피드1랭크 | onTryHit(Electric)+onTryBoost |
| `wind-rider` (부:C3) | 바람타기 | 3 | 바람기술 무효 +공격1랭크 | onTryHit(wind)+onTryBoost |
| `well-baked-body` (부:C3) | 노릇노릇바디 | 1 | 불 타입 무효 +방어2랭크 | onTryHit(Fire)+onTryBoost |
| `earth-eater` | 흙먹기 | 1 | 땅 타입 무효+회복 | onTryHit(Ground) |

> 주의: `wind-rider`는 "바람 기술"이라는 **기술 플래그** 무효라 타입 단독으로 항상 x0는 아님(바람기는 여러 타입에 분포). v1에서 단순화하려면 타입 기준 무효(levitate/저수/축전/타오르는불꽃/흙먹기 등)만 우선.

### C2 — DEF 배율 보정 · 14종

| id | 한국어명 | 보유 | 메커니즘 | 근거 훅 |
|---|---|---|---|---|
| `thick-fat` | 두꺼운지방 | 30 | 불/얼음 피해 0.5x | onSourceModifyAtk/SpA(Fire,Ice,0.5) |
| `fluffy` | 복슬복슬 | 6 | 접촉기 0.5x, 불 2x | onSourceModifyDamage(contact/Fire) |
| `heatproof` | 내열 | 5 | 불 피해 0.5x | onSourceModifyAtk/SpA(Fire,0.5) |
| `filter` | 필터 | 4 | 효과굉장 피해 0.75x | onSourceModifyDamage(typeMod>0→0.75) |
| `solid-rock` | 하드록 | 4 | 효과굉장 피해 0.75x | onSourceModifyDamage(typeMod>0→0.75) |
| `purifying-salt` (부:C8) | 정화의소금 | 3 | 고스트 피해 0.5x +상태면역 | onSourceModifyDamage(Ghost,0.5) |
| `prism-armor` | 프리즘아머 | 3 | 효과굉장 피해 0.75x | onSourceModifyDamage(typeMod>0→0.75) |
| `multiscale` | 멀티스케일 | 3 | 풀피시 피해 0.5x | onSourceModifyDamage(hp===max→0.5) |
| `marvel-scale` (부:C8) | 이상한비늘 | 3 | 상태이상시 방어 1.5x | onModifyDef(status) |
| `ice-scales` | 얼음인분 | 2 | 특수기 피해 0.5x | onSourceModifyDamage(special→0.5) |
| `fur-coat` | 퍼코트 | 2 | 물리기 피해 0.5x | onModifyDef(physical) |
| `grass-pelt` (부:C7) | 풀모피 | 2 | 그래스필드시 방어 1.5x | onModifyDef(grassy terrain) |
| `shadow-shield` | 스펙터가드 | 1 | 풀피시 피해 0.5x | onSourceModifyDamage(hp===max→0.5) |
| `wonder-guard` (부:C1) | 불가사의부적 | 1 | 효과굉장 외 전부 무효(x0) | onTryHit(typeMod<=0→immune) |

> **타입 단독으로 항상 적용되는 것**: thick-fat(불/얼음), heatproof(불), purifying-salt(고스트). 이들이 v1 C2의 깨끗한 코어.
> filter/solid-rock/prism-armor/multiscale/shadow-shield/ice-scales/fur-coat 는 "효과굉장 여부·물리특수·HP" 등 **계산 결과나 분류에 의존** → 배율 산식 안에서 자동 처리 가능(데이터로 표만 두면 됨).
> wonder-guard는 사실상 x0 대량 발생(C1 성격) — 데이터에 1종만 존재, v1 특례 처리 또는 보류 가능.

### C3 — DEF 피격시 랭크 단서 · 20종

| id | 한국어명 | 보유 | 메커니즘 | 근거 훅 |
|---|---|---|---|---|
| `weak-armor` | 깨어진갑옷 | 24 | 피격시 방어-1 스피드+2 | onDamagingHit(boost) |
| `rattled` | 주눅 | 20 | 악/고스트/벌레 피격시 스피드+1 | onDamagingHit(type→spe+1) |
| `anger-point` | 분노의경혈 | 12 | 급소 피격시 공격+6 | onHit(crit→atk max) |
| `aftermath` (부:C8) | 유폭 | 10 | 접촉 기절시 상대 1/4 피해 | onDamagingHit(faint+contact) |
| `justified` | 정의의마음 | 9 | 악 타입 피격시 공격+1 | onDamagingHit(Dark→atk+1) |
| `gooey` | 미끈미끈 | 7 | 접촉피격시 상대 스피드-1 | onDamagingHit(contact→foe spe-1) |
| `stamina` | 지구력 | 3 | 피격시 방어+1 | onDamagingHit(def+1) |
| `steam-engine` | 증기기관 | 3 | 물/불 피격시 스피드+6 | onDamagingHit(Fire/Water→spe+6) |
| `thermal-exchange` (부:C8) | 열교환 | 3 | 불 타입 피격시 공격+1 | onDamagingHit(Fire→atk+1) |
| `sand-spit` (부:C7) | 모래뿜기 | 2 | 피격시 모래바람 | onDamagingHit(setWeather) |
| `tangling-hair` | 컬리헤어 | 2 | 접촉피격시 상대 스피드-1 | onDamagingHit(contact→foe spe-1) |
| `cotton-down` | 솜털 | 2 | 피격시 모든상대 스피드-1 | onDamagingHit(spe-1) |
| `water-compaction` | 꾸덕꾸덕굳기 | 2 | 물 타입 피격시 방어+2 | onDamagingHit(Water→def+2) |
| `wind-power` (부:C5) | 풍력발전 | 2 | 피격/바람시 충전 표식 | onDamagingHit(charge) |
| `toxic-debris` (부:C6) | 독치장 | 2 | 물리피격시 상대측 독압정 | onDamagingHit(physical→toxicspikes) |
| `innards-out` (부:C8) | 내용물분출 | 2 | 기절시 잃은HP만큼 상대피해 | onDamagingHit(faint→dmg) |
| `electromorphosis` (부:C5) | 전기로바꾸기 | 1 | 피격시 충전 표식 | onDamagingHit(charge) |
| `seed-sower` (부:C7) | 넘치는씨 | 1 | 피격시 그래스필드 | onDamagingHit(setTerrain) |
| `mirror-armor` | 미러아머 | 1 | 받는 랭크하락을 상대에 반사 | onTryBoost(reflect) |
| `perish-body` (부:C8) | 멸망의바디 | 1 | 접촉피격시 양쪽 멸망의노래 | onDamagingHit(contact→perishsong) |

> 단서로 쓸 만한 "타입/분류 조건부 랭크" 핵심: weak-armor(물리), rattled(악/고스트/벌레), justified(악), water-compaction(물), steam-engine(불/물), thermal-exchange(불), gooey/tangling-hair(접촉). 나머지는 날씨/기절/도구 등 단발 모델 밖 부수효과.

### C4 — DEF 등장시 단서 · 12종

| id | 한국어명 | 보유 | 메커니즘 | 근거 훅 |
|---|---|---|---|---|
| `intimidate` | 위협 | 45 | 등장시 상대 공격-1 | onStart(foe atk-1) |
| `frisk` (부:C8) | 통찰 | 30 | 등장시 상대 도구 공개 | onStart(reveal item) |
| `anticipation` (부:C8) | 위험예지 | 15 | 등장시 위험기 감지 | onStart(warn) |
| `trace` (부:C8) | 트레이스 | 7 | 등장시 상대 특성 복사 | onStart(copy ability) |
| `forewarn` (부:C8) | 예지몽 | 6 | 등장시 최고위력기 공개 | onStart(reveal) |
| `download` | 다운로드 | 4 | 등장시 공격or특공+1 | onStart(boost) |
| `intrepid-sword` | 불요의검 | 2 | 등장시 공격+1 | onStart(atk+1) |
| `dauntless-shield` | 불굴의방패 | 2 | 등장시 방어+1 | onStart(def+1) |
| `supersweet-syrup` | 감미로운꿀 | 2 | 첫 등장시 상대 회피-1 | onStart(evasion-1 once) |
| `curious-medicine` (부:C8) | 기묘한약 | 1 | 등장시 아군 랭크 초기화 | onStart(clear boosts) |
| `as-one-glastrier` (부:C8) | 혼연일체 | 1 | 긴장감(Unnerve=나무열매봉인) + 백의울음(Chilling Neigh=기절시 자공격↑=C5) — **위협 아님** | onStart |
| `as-one-spectrier` (부:C8) | 혼연일체 | 1 | 긴장감(Unnerve) + 사신의말(Grim Neigh=기절시 자특공↑=C5) | onStart |

> `intimidate`(45)가 압도적. 게임이 "등장 단서"를 줄지 미정 — 준다면 랭크 채널 재사용(C3과 동일 출력 형식)으로 자연 확장 가능.

### C5 — ATK 공격시 발동 (정답이 행동해야 관측) · 52종

> 관측하려면 **정답 포켓몬이 공격자가 되는 신규 메커닉**이 필요. 보유 합 497로 최대 버킷. 전체 목록:

| id | 한국어명 | 보유 | 메커니즘 | 근거 훅 |
|---|---|---|---|---|
| `sheer-force` | 우격다짐 | 35 | 부가효과기 위력1.3x | onModifyMove+onBasePower |
| `swarm` | 벌레의알림 | 31 | HP1/3↓ 벌레기 1.5x | onModifyAtk/SpA(Bug,lowHP) |
| `overgrow` | 심록 | 30 | HP1/3↓ 풀기 1.5x | onModifyAtk/SpA(Grass,lowHP) |
| `blaze` | 맹화 | 30 | HP1/3↓ 불기 1.5x | onModifyAtk/SpA(Fire,lowHP) |
| `torrent` | 급류 | 30 | HP1/3↓ 물기 1.5x | onModifyAtk/SpA(Water,lowHP) |
| `hustle` | 의욕 | 27 | 물리 위력1.5x(명중-) | onModifyAtk(1.5)+onModifyMove |
| `mold-breaker` | 틀깨기 | 26 | 상대 방어특성 무시 | onModifyMove(ignoreAbility) |
| `technician` | 테크니션 | 24 | 위력60이하 1.5x | onBasePower(bp<=60) |
| `guts` (부:C8) | 근성 | 24 | 상태이상시 공격1.5x | onModifyAtk(status) |
| `rock-head` | 돌머리 | 23 | 반동 데미지 무효 | onDamage(recoil→0) |
| `iron-fist` | 철주먹 | 19 | 펀치기 위력1.2x | onBasePower(punch) |
| `sand-force` (부:C7) | 모래의힘 | 18 | 모래시 바위/땅/강철 1.3x | onBasePower(weather) |
| `adaptability` | 적응력 | 16 | 자속 1.5→2.0x | onModifySTAB |
| `scrappy` | 배짱 | 15 | 노말/격투기 고스트 명중 | onModifyMove(ignoreImmunity) |
| `reckless` | 이판사판 | 13 | 반동기 위력1.2x | onBasePower(recoil) |
| `analytic` | 애널라이즈 | 12 | 후공시 위력1.3x | onBasePower(moved last) |
| `tinted-lens` | 색안경 | 12 | 반감기 피해 2x | onModifyDamage(typeMod<0→2x) |
| `strong-jaw` | 옹골찬턱 | 11 | 무는기술 1.5x | onBasePower(bite) |
| `super-luck` | 대운 | 9 | 급소율+1 | onModifyCritRatio |
| `tough-claws` | 단단한발톱 | 8 | 접촉기 위력1.3x | onBasePower(contact) |
| `protean` | 변환자재 | 8 | 공격 직전 기술 타입 변신 | onPrepareHit(type change) |
| `stakeout` | 잠복 | 8 | 교체나온 상대 위력2x | onModifyAtk/SpA(2x) |
| `huge-power` | 천하장사 | 7 | 공격 2x | onModifyAtk(2x) |
| `sharpness` | 예리함 | 4 | 베기기술 1.5x | onBasePower(slicing) |
| `mega-launcher` | 메가런처 | 3 | 파동/오라기 1.5x | onBasePower(pulse) |
| `pure-power` | 순수한힘 | 3 | 공격 2x | onModifyAtk(2x) |
| `libero` | 리베로 | 3 | 공격 직전 기술 타입 변신 | onPrepareHit(type change) |
| `pixilate` | 페어리스킨 | 3 | 노말기→페어리(1.2x) | onModifyType |
| `refrigerate` | 프리즈스킨 | 3 | 노말기→얼음(1.2x) | onModifyType |
| `galvanize` | 일렉트릭스킨 | 3 | 노말기→전기(1.2x) | onModifyType |
| `liquid-voice` | 촉촉보이스 | 3 | 소리기→물 | onModifyType(sound) |
| `stalwart` | 굳건한신념 | 3 | 유인특성 무시 | onModifyMove |
| `unseen-fist` | 보이지않는주먹 | 3 | 접촉기 방어 관통 | onModifyMove |
| `water-bubble` (부:C2) | 수포 | 2 | 물기 2x(공격)+불 0.5x(방어) | onModifyAtk/SpA(Water,2) |
| `punk-rock` (부:C2) | 펑크록 | 2 | 소리기 1.3x +소리피해0.5x | onBasePower(sound) |
| `flare-boost` (부:C8) | 열폭주 | 2 | 화상시 특수기 1.5x | onBasePower |
| `normalize` | 노말스킨 | 2 | 전 기술 노말화(1.2x) | onModifyType |
| `aerilate` | 스카이스킨 | 2 | 노말기→비행(1.2x) | onModifyType |
| `teravolt` | 테라볼티지 | 2 | 상대 특성 무시 | onModifyMove(ignoreAbility) |
| `turboblaze` | 터보블레이즈 | 2 | 상대 특성 무시 | onModifyMove(ignoreAbility) |
| `propeller-tail` | 스크루지느러미 | 2 | 유인특성 무시 | onModifyMove |
| `merciless` (부:C8) | 무도한행동 | 2 | 독상대 항상 급소 | onModifyCritRatio |
| `gorilla-tactics` | 무아지경 | 2 | 공격1.5x(기술고정) | onModifyAtk(1.5) |
| `defeatist` (부:C8) | 무기력 | 2 | HP절반↓ 공격/특공 0.5x | onModifyAtk/SpA(hp<=half→0.5) |
| `transistor` | 트랜지스터 | 1 | 전기기 1.3x | onModifyAtk/SpA(Electric) |
| `dragons-maw` | 용의턱 | 1 | 드래곤기 특공1.5x | onModifyAtk/SpA(Dragon) |
| `rocky-payload` | 바위나르기 | 1 | 바위기 1.5x | onModifyAtk/SpA(Rock) |
| `steelworker` | 강철술사 | 1 | 강철기 1.5x | onModifyAtk/SpA(Steel) |
| `steely-spirit` | 강철정신 | 1 | 아군 강철기 1.5x | onAllyBasePower(Steel) |
| `toxic-boost` (부:C8) | 독폭주 | 1 | 독상태 물리기 1.5x | onBasePower |
| `neuroforce` | 브레인포스 | 1 | 효과굉장기 1.25x | onModifyDamage(typeMod>0) |
| `dragonize` | 드래곤스킨 | 1 | 노말기→드래곤(1.2x) | onModifyType+onBasePower |

> **단서 가치가 큰 하위군**: 타입 변화(protean/libero/-ate 계열/normalize)는 "정답이 공격한 타입이 비정상"이라는 강한 단서. 자속/저HP 부스트(overgrow/blaze/torrent/swarm/adaptability)와 위력군(sheer-force/technician/tough-claws/iron-fist...)은 정답의 공격 배율을 흔든다. mold-breaker/teravolt/turboblaze는 "C1/C2 방어특성 무시" → C1/C2 단서와 상호작용.

### C6 — 접촉/상태 응징 · 15종 (대표 + 개수)

`static`(22), `flame-body`(21), `poison-point`(20), `cute-charm`(15), `pickpocket`(15), `cursed-body`(13), `effect-spore`(11), `poison-touch`(11), `stench`(9), `rough-skin`(6), `iron-barbs`(3), `mummy`(2), `wandering-spirit`(2), `gulp-missile`(1), `lingering-aroma`(1).
- 공통: `onDamagingHit(contact)` / `onAfterMoveSecondary`로 상태이상·도구탈취·특성변경. **상태 모델이 없으면 v1 비관측**(rough-skin/iron-barbs는 접촉 반동 피해이나 단발 배율 단서로 부적합).

### C7 — 날씨/필드/지형 · 19종 (대표 + 개수)

`protosynthesis`(10), `quark-drive`(10), `snow-warning`(9), `drought`(5), `sand-stream`(5), `forecast`(4), `grassy-surge`(4), `drizzle`(3), `electric-surge`(3), `psychic-surge`(3), `misty-surge`(2), `delta-stream`(1), `desolate-land`(1), `flower-gift`(1), `hadron-engine`(1), `ice-face`(1), `mimicry`(1), `orichalcum-pulse`(1), `primordial-sea`(1).
- 광역 상태(날씨/필드) 모델 필요 → **v1 범위 밖**. delta-stream(비행 약점 무효)·desolate-land/primordial-sea(불/물 무효화)는 단발 배율에 간접 영향이나 v1 비대상.

### C8 — 비관측/모델밖 · 164종 (상위만)

`sturdy`(47, 일격사 방지·HP모델 밖), `swift-swim`/`chlorophyll`(스피드), `keen-eye`/`inner-focus`/`own-tempo`/`oblivious`(상태·랭크하락 면역), `regenerator`/`ice-body`/`hydration`(회복·상태), `pressure`/`infiltrator`/`unnerve`(유틸), `shell-armor`(급소무효), `magic-bounce`/`telepathy`/`overcoat`/`soundproof`/`bulletproof`/`good-as-gold`(특정 기술군 무효지만 **공격 타입 신호 밖** — 아래 주의 참조).
- 이들은 단발 `judge(action, secret)`의 **타입·배율·랭크 단서로 환원되지 않음**.

#### C8 주의 (검토 후 잔류 결정한 항목)

- `bulletproof`(방탄, 11) / `soundproof`(방음, 17): showdown은 x0 면역이나, 무효 조건이 **move 플래그(bullet/sound)**이지 **공격 타입**이 아니다. 액션 모델이 "타입+물리/특수"라 플래그 면역은 **관측 불가** → C8(부:C1*).
- `good-as-gold`(황금몸, 1): **변화기(category Status)** 무효 — 변화기는 액션 모델 밖 → C8.
- `sand-veil`/`snow-cloak`/`ice-body`/`magma-armor`/`sand-rush`/`overcoat`의 `onImmunity`는 **날씨 피해 면역**이지 공격-타입 면역이 아니므로 C1 아님.
- `sniper`(급소시 1.5x), `rivalry`(성별), `supreme-overlord`(기절 누적)은 액션 신호 밖 → C8.

---

## 검증

- 추출 명령(특성 빈도): `node`로 `src/data/pokemon.json`의 `Object.values(data)` 1209건을 순회, `.abilities[].id` 집계 → **고유 308종** 확인.
- 매칭 검증: 308종 전부 showdown `abilities.ts` 블록과 1:1 매칭(하이픈 제거 키), **매칭 실패 0건**.
- 훅 추출: 각 showdown 블록에서 `on[A-Z]\w+` 정규식으로 핸들러 훅 수집 후, 단서 관련 카테고리(C1~C5)는 핸들러 본문을 수동 정밀 검토(bulletproof/good-as-gold/soundproof/dragonize/disguise/rivalry/sniper/defeatist/thermal-exchange 등 모호 항목 9건 직접 열람).
- 카테고리 합 308 = C1(12)+C2(14)+C3(20)+C4(12)+C5(52)+C6(15)+C7(19)+C8(164).

---

## 후속 작업 (PRD/ADR 반영 권장)

### v1 최소 단서 셋 권장 — 데이터 기반 결론

1. **가장 작은 코어 = C1 + C2 (26종)**.
   근거: 둘 다 "유저가 공격"만으로 **기존 데미지 배율 출력에 자동으로 실린다**. 신규 단서 채널·신규 메커닉 불필요.
   - C1은 x0(무효) 신호로 흡수 → "타입 면역(땅→비행)과 특성 면역(부유)을 x0로 통합"한다는 PRD 방향과 **정확히 일치**. 데이터상 levitate(41)·저수(28)·타오르는불꽃(27)이 빈도 상위라 x0 통합의 체감 가치가 크다.
   - C2는 비정상 배율(0.5x/0.75x/2x 등)로 노출 → 배율 산식 안에서 데이터 테이블만으로 처리 가능. v1 우선순위: 타입 단독 적용군(thick-fat·heatproof·purifying-salt)을 먼저, "효과굉장/물리특수 조건부"(filter·ice-scales 등)는 산식에 자연 편입.

2. **C3(랭크 단서)는 v1 또는 v1.1**.
   PRD에 이미 "능력 랭크 변화(-6~+6) 단서"가 출력 항목으로 있으므로, **랭크 채널이 v1에 있다면 C3도 v1**에 포함하는 게 자연스럽다. 단, C3 20종 중 단발 모델에 깨끗이 맞는 건 "타입/분류 조건부 랭크"(weak-armor·rattled·justified·water-compaction·steam-engine·thermal-exchange·gooey·tangling-hair) 약 8~10종이고, 나머지는 날씨·기절·도구 부수효과라 v1에서 제외해도 무방. **권장: 랭크 채널을 v1에 넣되 C3는 "타입/분류 조건부 랭크" 화이트리스트만 우선 구현.**

3. **C4(등장 단서)는 등장 이벤트 설계가 정해진 뒤**. intimidate(45) 하나만으로도 가치가 크지만, "정답이 등장하는 연출/이벤트"가 게임 루프에 없으면 관측 불가. C3과 같은 랭크 출력 형식을 재사용하므로, 등장 이벤트만 도입되면 추가 비용은 작다.

4. **C5(정답이 공격하는 메커닉)는 명확히 확장 단계**.
   보유 합 497로 가장 풍부한 단서원이지만, **단발 `judge(action, secret)` 모델로는 구조적으로 불가** — "정답 포켓몬도 행동(공격)하게" 만드는 신규 메커닉이 전제. ADR 선택지로 다룰 가치가 큼:
   - 1차 후보(타입 변화군): protean/libero/-ate 계열 → "정답이 노말기를 쐈는데 타입이 바뀐다"는 강한 단서.
   - 2차 후보(위력·반동군): tough-claws/rock-head/reckless/iron-fist/technician/sheer-force 등 PRD 예시와 일치.
   - mold-breaker/teravolt/turboblaze는 C1·C2 방어특성을 무시하므로, C5 도입 시 C1·C2 단서와의 상호작용을 함께 설계해야 함.

5. **C6/C7/C8은 v1 비대상**. C6은 상태 모델, C7은 광역 날씨/필드 모델 필요 — 둘 다 단발 판정 범위 밖. C8은 단서로 환원 불가.

### ADR 결정 지점 후보

- **결정 1**: v1 단서 범위를 `C1+C2`(최소) vs `C1+C2+C3`(랭크 포함) 중 어디로? → 랭크 채널의 v1 포함 여부와 연동.
- **결정 2**: x0 통합 시 C1 특성의 "흡수 후 부수효과"(회복·랭크업)를 v1에서 버릴지(순수 x0) 살릴지. 데이터상 C1 12종 중 8종이 흡수+랭크업 → 단순 x0면 정보 손실은 작음(랭크 단서가 v1에 없으면 어차피 안 보임).
- **결정 3**: C5 메커닉("정답이 공격") 도입 시점·범위. 타입 변화군부터 점진 도입 권장.

### 데이터 후속

- v1 구현 시 특성→배율/면역 매핑 테이블을 데이터로 분리(showdown 핸들러를 직접 포팅하지 않고, 카테고리별 산식 파라미터만 추출).
- `wind-rider`(C1)·filter류(C2)처럼 "타입 단독이 아닌 조건"은 산식 분기 필요 — v1 화이트리스트에서 처리 정책 명시.

## 관련 문서

- PRD: `./prd.md`
- ADR: `./adr.md`
- 데이터: `src/data/pokemon.json` (1209 candidate, 308 ability)
- 메커니즘 근거: Pokémon Showdown (`smogon/pokemon-showdown`) `data/abilities.ts` (로컬 레퍼런스 스냅샷)

---

## v1 스코프 보강 분석

> 위 C1~C8 분석을 기반으로, 확정된 v1 스코프에 맞춰 4개 하위셋을 정밀화한다.
> 모두 우리 데이터셋(308종)에 실재하는 것만, showdown 핸들러 근거로 분류한다.

### 확정 v1 스코프 (관측 이벤트 2종)

- **(A) 정답 등장 이벤트**: `C4`(등장 발동) + `C7 중 "날씨/필드 설치(onStart)" 특성`을 같은 "등장 단서"로 커버.
- **(B) 유저 행동 이벤트**: ① 공격(타입+물리/특수) = `C1/C2/C3`, ② **상태이상기**, ③ **랭크 변화기**.
- `C5`(정답이 공격) = **v1 비목표**. 단 확장 시드는 설계에 남긴다.

> ⚠️ **핵심 정확성 경계**: `guts`(근성)/`flare-boost`(열폭주)/`toxic-boost`(독폭주)처럼 "상태가 되면 **자기 공격이 강해지는**" 특성은 **정답이 공격해야** 관측된다(=C5). 따라서 유저가 상태이상기를 써도 v1에서는 **관측 불가**. 반면 `defiant`/`competitive`(스탯하락→자기 랭크업)와 상태 면역(상태 자체가 안 걸림)은 유저 행동만으로 **관측 가능**. 이 경계가 보강2·3·4의 분류 기준이다.

---

### 보강1 — C7 "설치(SET) vs 수혜(BENEFIT)" 분리

C7 19종을 (a) 등장 시 날씨/필드를 **설치**하는 특성(`onStart` 발동 → **(A) 등장 단서로 관측 가능**)과 (b) 날씨를 **수혜만** 하는 특성(등장 단서 아님, v1 밖)으로 분리.

#### (a) 설치 특성 — v1 등장 단서 대상 · 13종

| id | 한국어명 | 보유 | 설치 대상 | 근거 훅 |
|---|---|---|---|---|
| `snow-warning` | 눈퍼뜨리기 | 9 | 날씨: 설경(눈) | onStart→setWeather(snowscape) |
| `drought` | 가뭄 | 5 | 날씨: 쾌청 | onStart→setWeather(sunnyday) |
| `sand-stream` | 모래날림 | 5 | 날씨: 모래바람 | onStart→setWeather(sandstorm) |
| `grassy-surge` | 그래스메이커 | 4 | 필드: 그래스필드 | onStart→setTerrain(grassyterrain) |
| `drizzle` | 잔비 | 3 | 날씨: 비 | onStart→setWeather(raindance) |
| `electric-surge` | 일렉트릭메이커 | 3 | 필드: 일렉트릭필드 | onStart→setTerrain(electricterrain) |
| `psychic-surge` | 사이코메이커 | 3 | 필드: 사이코필드 | onStart→setTerrain(psychicterrain) |
| `misty-surge` | 미스트메이커 | 2 | 필드: 미스트필드 | onStart→setTerrain(mistyterrain) |
| `orichalcum-pulse` | 진홍빛고동 | 1 | 날씨: 쾌청(+자기 공격 강화) | onStart→setWeather(sunnyday) |
| `desolate-land` | 끝의대지 | 1 | 날씨: 강한 햇살(물기 무효화) | onStart→setWeather(desolateland)+onAnySetWeather |
| `primordial-sea` | 시작의바다 | 1 | 날씨: 강한 비(불기 무효화) | onStart→setWeather(primordialsea)+onAnySetWeather |
| `delta-stream` | 델타스트림 | 1 | 날씨: 난기류(비행 약점 무효) | onStart→setWeather(deltastream)+onAnySetWeather |
| `hadron-engine` | 하드론엔진 | 1 | 필드: 일렉트릭필드(+자기 특공 강화) | onStart→setTerrain(electricterrain) |

> 등장 단서로는 "설치된 날씨/필드 종류" 자체가 정답을 좁히는 신호. 부수효과(orichalcum-pulse/hadron-engine의 자기 강화, desolate/primordial의 타입 무효화)는 C5/C7 성격이라 v1 등장 단서에서는 "어떤 날씨/필드를 깔았나"만 노출 권장.

#### (b) 수혜 특성 — 등장 단서 아님, v1 밖 · 6종(+α)

| id | 한국어명 | 보유 | 수혜 내용 | v1 |
|---|---|---|---|---|
| `swift-swim` | 쓱쓱 | 46 | 비일 때 스피드 2x | 밖 (등장시 SET 안 함) |
| `chlorophyll` | 엽록소 | 38 | 쾌청일 때 스피드 2x | 밖 |
| `sand-force` | 모래의힘 | 18 | 모래일 때 바위/땅/강철 위력1.3x(=C5) | 밖 |
| `solar-power` | 선파워 | 9 | 쾌청일 때 특공1.5x(HP감소) | 밖 |
| `sand-rush` | 모래헤치기 | 10 | 모래일 때 스피드 2x | 밖 |
| `slush-rush` | 눈치우기 | 7 | 설경일 때 스피드 2x | 밖 |
| `rain-dish` | 젖은접시 | 13 | 비일 때 HP회복 | 밖 |
| `leaf-guard` | 리프가드 | 21 | 쾌청일 때 상태이상 면역(=보강2 조건부) | 밖(날씨 의존) |
| `ice-body` | 아이스바디 | 21 | 설경일 때 HP회복 | 밖 |
| `sand-veil` | 모래숨기 | 29 | 모래일 때 회피↑ | 밖 |
| `snow-cloak` | 눈숨기 | 15 | 설경일 때 회피↑ | 밖 |
| `dry-skin` | 건조피부 | 7 | 비 회복/쾌청 피해(=C1/C2 주분류) | 밖(수혜측면만) |
| `protosynthesis` | 고대활성 | 10 | 쾌청/부스트에너지로 최고스탯↑ | 밖 |
| `quark-drive` | 쿼크차지 | 10 | 일렉트릭필드/부스트에너지로 최고스탯↑ | 밖 |
| `flower-gift` | 플라워기프트 | 1 | 쾌청시 공격/특방↑ | 밖 |
| `forecast` | 기분파 | 4 | 날씨 따라 자기 타입 변화 | 밖 |
| `ice-face` | 아이스페이스 | 1 | 설경시 얼굴 복구 | 밖 |
| `mimicry` | 의태 | 1 | 필드 따라 자기 타입 변화 | 밖 |

> **결론**: C7 중 등장 단서로 관측 가능한 것은 **설치 13종**. 수혜군(약 18종, 빈도 큰 쓱쓱46·엽록소38 포함)은 날씨가 깔려야만 의미가 있어 등장 단서 아님 → v1 밖.

---

### 보강2 — 상태이상기로 관측되는 "상태 면역/반사" 특성

유저가 **상태이상기**를 썼을 때, 정답이 그 상태에 **안 걸리거나(면역)** **되받아치면(반사)** 그 자체가 단서. 우리 데이터 실재분 전수.

| id | 한국어명 | 보유 | 막는/반사 대상 | 관측 트리거 | 근거 훅 |
|---|---|---|---|---|---|
| `inner-focus` | 정신력 | 38 | 풀죽음(+위협 무효) | 풀죽음·위협 | onTryAddVolatile(flinch) |
| `own-tempo` | 마이페이스 | 33 | 혼란(+위협 무효) | 혼란기(이상한빛 등) | onUpdate/onTryAddVolatile(confusion) |
| `oblivious` | 둔감 | 25 | 매혹·도발 | 사랑의키스·도발 | onUpdate/onImmunity(attract,taunt) |
| `leaf-guard` | 리프가드 | 21 | **쾌청일 때** 모든 상태이상 | 상태이상기(날씨 조건부) | onSetStatus(weather=sun) |
| `insomnia` | 불면 | 18 | 잠듦(+하품) | 잠재우기·최면술 | onSetStatus(slp)/onUpdate |
| `vital-spirit` | 의기양양 | 16 | 잠듦(+하품) | 잠재우기·최면술 | onSetStatus(slp)/onUpdate |
| `limber` | 유연 | 14 | 마비 | 전기자석파·마비가루 | onSetStatus(par)/onUpdate |
| `water-veil` | 수의베일 | 13 | 화상 | 도깨비불 | onSetStatus(brn)/onUpdate |
| `sweet-veil` | 스위트베일 | 9 | 잠듦(+하품, 자신/아군) | 잠재우기 | onAllyTryAddVolatile/onSetStatus(slp) |
| `aroma-veil` | 아로마베일 | 7 | 매혹·도발·앵콜·조이기·헤롱·회복봉인 | 도발·앵콜 등 | onAllyTryAddVolatile |
| `immunity` | 면역 | 3 | 독·맹독 | 독찌르기·맹독 | onSetStatus(psn,tox)/onUpdate |
| `magma-armor` | 마그마의무장 | 3 | 얼음(얼음 상태) | (얼음 직접 부여기 드묾) | onImmunity(frz)/onUpdate |
| `purifying-salt` | 정화의소금 | 3 | **모든 상태이상**(+고스트 피해0.5x=C2) | 상태이상기 전반 | onSetStatus(all)/onTryAddVolatile |
| `thermal-exchange` | 열교환 | 3 | 화상(+피격시 공격↑=C3) | 도깨비불 | onSetStatus(brn)/onUpdate |
| `pastel-veil` | 파스텔베일 | 2 | 독·맹독(자신/아군) | 독찌르기·맹독 | onSetStatus(psn,tox)/onUpdate |
| `water-bubble` | 수포 | 2 | 화상(+물기2x=C5/불피해0.5x=C2) | 도깨비불 | onSetStatus(brn)/onUpdate |
| `flower-veil` | 플라워베일 | 4 | 풀타입 아군 상태이상·랭크하락 차단 | (자신은 풀타입 한정) | onAllyTryAddVolatile/onAllyTryBoost |
| `comatose` | 절대안깸 | 1 | 모든 상태이상(항상 잠듦 취급) | 상태이상기 전반 | onSetStatus(all) |
| `shields-down` | 리밋실드 | 1 | 폼 상태에서 상태이상 면역(+하품) | 상태이상기(폼 조건부) | onSetStatus/onTryAddVolatile |
| `synchronize` | 싱크로 | (별도) | **상태 반사**(독·마비·화상을 시전자에게) | 독·마비·화상기 | onAfterSetStatus(reflect) |

> `synchronize`는 위 status-hook 스캔에 안 잡혔으나(`onAfterSetStatus` 사용) 데이터 실재 → 별도 행에 표기. **잠듦/얼음은 반사 안 함**(showdown: slp/frz 제외).
> **불확실**: `flower-veil`은 "풀타입 아군"이 조건이라 자기 자신에 적용되려면 정답이 풀타입이어야 함 — 단발 모델에서 부분 관측. `shields-down`은 폼 변화 조건부.

> **결론**: 상태이상기로 관측되는 면역/반사 특성 = **약 20종**. 빈도 상위(정신력38·마이페이스33·둔감25)가 풍부. 화상/마비/혼란/잠듦/독 각각에 대응 특성이 존재해 상태이상기 단서의 변별력이 충분.

---

### 보강3 — 랭크 변화기로 관측되는 "스탯하락 반응/차단/반사" 특성

유저가 **랭크하락기**(예: 꼬리흔들기=방어-1)를 썼을 때 정답이 보이는 반응. 우리 데이터 실재분 전수. 세 부류:

| id | 한국어명 | 보유 | 부류 | 메커니즘 | 근거 훅 |
|---|---|---|---|---|---|
| `keen-eye` | 날카로운눈 | 43 | 차단 | 명중 하락 차단(+상대 회피무시) | onTryBoost(accuracy<0 block) |
| `clear-body` | 클리어바디 | 19 | 차단 | 모든 스탯하락 차단 | onTryBoost(any<0 delete) |
| `defiant` | 오기 | 16 | **반응(랭크업)** | 스탯하락당하면 **공격+2** | onAfterEachBoost(<0→atk+2) |
| `competitive` | 승기 | 15 | **반응(랭크업)** | 스탯하락당하면 **특공+2** | onAfterEachBoost(<0→spa+2) |
| `big-pecks` | 부풀린가슴 | 15 | 차단 | 방어 하락 차단 | onTryBoost(def<0 block) |
| `hyper-cutter` | 괴력집게 | 11 | 차단 | 공격 하락 차단 | onTryBoost(atk<0 block) |
| `contrary` | 심술꾸러기 | 10 | **반전** | 모든 랭크변화 부호 반전(하락→상승) | onChangeBoost(*-1) |
| `illuminate` | 발광 | 8 | 차단 | 명중 하락 차단(+회피무시) | onTryBoost(accuracy<0 block) |
| `simple` | 단순 | 5 | **증폭** | 랭크변화 2배(하락도 2배) | onChangeBoost(*2) |
| `white-smoke` | 하얀연기 | 4 | 차단 | 모든 스탯하락 차단 | onTryBoost(any<0 delete) |
| `guard-dog` | 파수견 | 2 | **반응+면역** | 위협 등으로 하락시 무시하고 공격+1 | onTryBoost(intimidate→atk+1) |
| `full-metal-body` | 메탈프로텍트 | 1 | 차단 | 모든 스탯하락 차단(특성무시 불가) | onTryBoost(any<0 delete) |
| `minds-eye` | 심안 | 1 | 차단 | 명중 하락 차단(+고스트 명중) | onTryBoost(accuracy<0 block) |
| `mirror-armor` | 미러아머 | 1 | **반사** | 받는 랭크하락을 시전자에게 되돌림 | onTryBoost(reflect<0) |

> 참고: `unaware`(천진, 15)는 랭크하락 차단이 아니라 **계산 시 상대 랭크 무시**(onAnyModifyBoost)라 단발 단서로 부적합 → 표 제외. `simple`/`contrary`는 차단이 아니라 변형 — 유저가 하락기를 썼는데 "하락이 2배" 또는 "오히려 상승"으로 나타나면 강한 단서.

> **결론**: 랭크하락기로 관측되는 특성 = **14종**. 이 중 "하락→자기 랭크업 반응"(defiant16·competitive15·guard-dog2)과 "반전/증폭"(contrary10·simple5), "반사"(mirror-armor1)는 **명확한 양성 단서**. 차단군(clear-body·white-smoke·keen-eye 등)은 "하락이 안 먹힘(델타 0)"으로 관측. 전부 **유저 행동만으로 v1 관측 가능**.

---

### 보강4 — 제안 행동 기술셋 (대표 1개씩) → 관측 매핑

"대표적인 기술 한 개씩"으로 v1 행동 후보를 고정하고, 각 기술이 어떤 특성군을 드러내는지 매핑.

| 기술 | 효과 | 드러나는 특성군 | v1 관측 가능? |
|---|---|---|---|
| 도깨비불 | 화상 | water-veil·thermal-exchange·water-bubble·purifying-salt·comatose·leaf-guard(쾌청)·synchronize(반사) | 가능 (면역=상태無, 반사=시전자 화상) |
| 전기자석파 | 마비 | limber·purifying-salt·comatose·leaf-guard·synchronize(반사) | 가능 |
| 이상한빛 | 혼란 | own-tempo·(aroma-veil 일부) | 가능 |
| 맹독(또는 독압정) | 독·맹독 | immunity·pastel-veil·purifying-salt·comatose·synchronize(반사) | 가능 |
| 잠재우기(또는 최면술) | 잠듦 | insomnia·vital-spirit·sweet-veil·purifying-salt·comatose | 가능 |
| 꼬리흔들기 | 방어 -1 | clear-body·white-smoke·full-metal-body·big-pecks·defiant·competitive·contrary·simple·mirror-armor·guard-dog | 가능 (차단=델타0 / 반응=자기 랭크업 / 반전·반사) |

#### ⚠️ v1 관측 **불가**(C5, 정답이 공격해야 발동) — 상태이상기로 드러나지 않음

| 특성 | 한국어명 | 보유 | 왜 v1 불가 |
|---|---|---|---|
| `guts` | 근성 | 24 | 상태가 되면 **자기 공격1.5x** → 정답이 공격해야 관측 |
| `flare-boost` | 열폭주 | 2 | 화상시 **자기 특수기1.5x** → 정답이 공격해야 관측 |
| `toxic-boost` | 독폭주 | 1 | 독상태시 **자기 물리기1.5x** → 정답이 공격해야 관측 |
| `quick-feet` | 속보 | (해당시) | 상태시 **자기 스피드↑** → 단발 판정 밖 |
| `marvel-scale` | 이상한비늘 | 3 | 상태시 방어1.5x = **방어측 배율(C2)**이라 유저가 "정답을 상태로 만든 뒤 또 공격"해야 노출 → 단발 1회로는 불가 |

> **핵심 구분(형님 지시 반영)**: 상태이상기는 "상태가 **안 걸리는가**(면역/반사)"를 묻는 도구이지, "상태가 걸린 뒤 **공격이 세지는가**(guts류=C5)"를 묻는 도구가 아니다. 후자는 정답이 공격하는 메커닉(v1 비목표)에서만 관측된다. 마찬가지로 랭크변화기는 "오기/승기(하락→자기 랭크업)"와 "차단/반사"를 드러내지만, "정답이 그 랭크로 공격했을 때의 위력"은 드러내지 못한다.

### 보강 종합 — v1 관측표 갱신

| 보강 | 대상 특성 수(데이터 실재) | v1 관측 | 비고 |
|---|---|---|---|
| 보강1 C7 설치 | 13 | 가능 (A 등장 단서) | 수혜군 ~18종은 v1 밖 |
| 보강2 상태 면역/반사 | ~20 | 가능 (B② 상태이상기) | 화상/마비/혼란/독/잠듦 전 커버 |
| 보강3 랭크 반응/차단/반사 | 14 | 가능 (B③ 랭크변화기) | unaware는 부적합 제외 |
| 보강4 기술셋 | 대표 6기 | — | guts/flare/toxic-boost는 C5라 불가 명시 |

---

## 구현 계획

> 이 섹션은 `battle-judgment-engine`의 **구현 청사진(architect 산출물)**이다. ADR(accepted)의 계약을
> 바꾸지 않으며, 다음 단계 domain-engineer가 코드를 작성할 수 있도록 **명세**만 제공한다.
> 권위 출처: ADR `adr.md`(계약·정책), 위 C1~C3·C4·보강1~3 표(메커니즘·트랙 분류),
> `src/data/{types.ts,index.ts}`(소비할 데이터 계약), 고정 SHA api-data ko명 맵(nameKo).
> 화이트리스트의 모든 nameKo는 권위 ko명 맵에서 가져왔고, 모든 슬러그는 데이터셋 308종 내 실재함을 확인했다.

### 1. 파일 경계 (`src/engine/`)

의존 방향은 `src/data → src/engine` **단방향**(engine만 data를 import, 역참조 금지). 런타임 외부 fetch 0.

| 파일 | 책임 |
| --- | --- |
| `src/engine/types.ts` | 공개 계약 타입(ADR 결정(1)): `StatId`·`StatusId`·`WeatherId`·`TerrainId`·`DamageMultiplier`·`EntryEffect`·`Action`·`Clue`·`Secret` 판별 유니온 + `judge`/`entryClues` 시그니처. **추가로 화이트리스트 레코드 타입**(`AbilityRecord` 및 트랙별 효과 파라미터 타입). `assertNever` 헬퍼. data에서 `PokemonType`만 type-import. |
| `src/engine/abilities.ts` | v1 화이트리스트 **데이터**(아래 3절 전수 명세). 슬러그→`AbilityRecord` 맵 1개(`Readonly<Record<string, AbilityRecord>>`). 각 레코드에 `nameKo`(권위 맵) + 트랙별 효과 파라미터 내장. **계산 의존 술어를 요구하는 특성은 `predicate: '<이름>'` 키만 두고 파라미터는 비움**(데이터는 "어떤 술어를 쓸지"만 가리키고 계산은 predicates.ts가 한다). |
| `src/engine/predicates.ts` | 명명 술어(코드 escape hatch, 4절). `filterReduction`·`multiscaleReduction`·`wonderGuardBlocks`·`furCoatReduction`·`iceScalesReduction`·`fluffyModifier`·`desolatePrimordialBlocks` 등. 입력은 "공격 타입/분류 + 현재까지의 타입 배율 맥락", 출력은 배율 인자 또는 `0`/`null`. 순수 함수, secret/action만 인자. |
| `src/engine/tracks/attack.ts` | (A) 공격 트랙 해석기 `interpretAttack(action, secret): readonly Clue[]`. 타입 배율(getEffectiveness) × C1 면역 × C2 보정/술어 → `damage` Clue, 흡수랭크업이면 `rank` 동반. |
| `src/engine/tracks/entry.ts` | (B) 등장 트랙 해석기 `interpretEntry(secret): readonly Clue[]`. C4 + C7설치(보강1) → `entry`·`rank`·`marker`. |
| `src/engine/tracks/status.ts` | (C) 상태기 트랙 해석기 `interpretStatus(action, secret): readonly Clue[]`. 보강2 → `status{result}`·`marker('status-reflect')`. |
| `src/engine/tracks/stat.ts` | (D) 랭크기 트랙 해석기 `interpretStat(action, secret): readonly Clue[]`. 보강3 → `rank`·`marker('stat-reflect')`. 변형 적용 순서(차단>반전/증폭>반응) 고정. |
| `src/engine/index.ts` | `judge`/`entryClues` 오케스트레이터 + 트랙 레지스트리(`flatMap`) + 공개 re-export. C5 seam은 주석/타입으로만(레지스트리에 트랙 추가 자리). |
| `src/engine/*.test.ts` | Vitest. 트랙별 파일(`tracks/*.test.ts`) + 통합(`index.test.ts`) + 화이트리스트 정합(`abilities.test.ts`: nameKo 누락 0, 슬러그 실재). (6절) |

> 트랙 해석기는 `index.ts`의 오케스트레이터가 `judge`/`entryClues` 분기에서 호출한다. **트랙 레지스트리**는 `index.ts`에 `[interpretAttack|interpretStatus|interpretStat]` 형태로 두되, `judge`는 `action.kind`로 단일 트랙을 고르므로(공격/상태/랭크가 상호배타) 실제 다중 트랙 `flatMap`은 등장(entry)이 여러 효과(설치+자신부스트+marker)를 낼 때와 C5 트랙 추가 시 의미가 있다. ADR의 `tracks.flatMap(t => t.interpret(...))` 형태를 그대로 유지하되, 각 트랙이 자기 입력이 아니면 빈 배열을 반환하도록 설계해 레지스트리 단일화한다(domain-engineer 재량: `kind` 스위치 분기 vs 균일 레지스트리 — 둘 다 ADR과 정합, 후자가 C5 확장에 더 균일).

### 2. 공개 타입 (TS 스켈레톤)

ADR 결정(1)을 그대로 반영한다. **화이트리스트 레코드 타입은 신규 설계**(ADR (3)·(6)의 "트랙+효과 파라미터+nameKo"를 구체화).

```ts
import type { PokemonType } from '../data' // 단방향 의존

// ── 신규 리터럴 (데이터 계약에 없음) ──
export type StatId    = 'atk' | 'def' | 'spa' | 'spd' | 'spe'
export type StatusId  = 'burn' | 'paralysis' | 'confusion' | 'poison' | 'sleep'
export type WeatherId = 'sun' | 'rain' | 'sandstorm' | 'snow' | 'harsh-sun' | 'heavy-rain'
export type TerrainId = 'grassy' | 'electric' | 'psychic' | 'misty'
export type DamageMultiplier = number // 정밀 곱 별칭 (데이터계약 Multiplier 0|0.5|1|2 와 별개)

export type EntryEffect =
  | { kind: 'weather'; weather: WeatherId }
  | { kind: 'terrain'; terrain: TerrainId }
  // 등장 자신부스트는 Clue.rank{target:'secret'} 로 일원화 → EntryEffect엔 두지 않음

// ── 입력 ──
export type Action =
  | { kind: 'attack'; attackType: PokemonType; category: 'physical' | 'special' }
  | { kind: 'status'; status: StatusId }
  | { kind: 'stat';   stat: StatId; stages: number } // v1 대표 {stat:'def', stages:-1}

export interface Secret { candidate: Candidate; ability: Ability } // data 계약 재사용

// ── 출력 ──
export type Clue =
  | { kind: 'damage'; multiplier: DamageMultiplier }
  | { kind: 'rank';   target: 'secret'; stat: StatId; delta: number }
  | { kind: 'status'; status: StatusId; result: 'applied' | 'immune' } // 반사는 marker
  | { kind: 'entry';  effect: EntryEffect }
  | { kind: 'marker'; marker: 'intimidate' | 'status-reflect' | 'stat-reflect' }
  // C5 seam(후속): | { kind: 'offense'; powerMod?: number; typeOverride?: PokemonType; ignoresDefensiveAbility?: boolean }

export declare function judge(action: Readonly<Action>, secret: Readonly<Secret>): readonly Clue[]
export declare function entryClues(secret: Readonly<Secret>): readonly Clue[]

// ── 화이트리스트 레코드 타입 (신규 설계) ──
// 한 특성이 여러 트랙에 걸칠 수 있으므로(예: thermal-exchange = C3 피격랭크 + 보강2 화상면역),
// 레코드는 "트랙별 효과 슬롯"의 부분집합을 갖는다(전부 optional). 트랙 해석기는 자기 슬롯만 읽는다.
export interface AbilityRecord {
  slug: string
  nameKo: string                          // 권위 ko명 맵에서
  attack?: AttackEffect                    // (A) 공격 트랙
  entry?: EntryAbilityEffect               // (B) 등장 트랙
  status?: StatusAbilityEffect             // (C) 상태기 트랙
  stat?: StatAbilityEffect                 // (D) 랭크기 트랙
}

// (A) 공격: 타입면역 / 흡수랭크업 / 배율보정(선언) / 술어(계산의존)
export type AttackEffect =
  // C1 순수 타입면역 (x0, 부수효과 없음)
  | { kind: 'immuneType'; immuneTo: PokemonType }
  // C1 흡수 + 자신 랭크업 (x0 + rank)
  | { kind: 'absorbBoost'; immuneTo: PokemonType; stat: StatId; delta: number }
  // C2 선언적 배율보정 (타입 조건 만족 시 multiplier ×= factor)
  | { kind: 'multiplier'; appliesToTypes?: PokemonType[]; category?: 'physical' | 'special'; factor: number }
  // C2/C1 계산의존 → predicates.ts 위임
  | { kind: 'predicate'; predicate: AttackPredicateName }

export type AttackPredicateName =
  | 'filter'            // 효과굉장이면 ×0.75 (filter/solid-rock/prism-armor)
  | 'multiscale'        // (풀피 가정) ×0.5 (multiscale/shadow-shield)
  | 'iceScales'         // 특수기 ×0.5
  | 'furCoat'           // 물리기 ×0.5
  | 'fluffy'            // 접촉기 ×0.5 + 불 ×2 (접촉=관측불가 → 정책 4절)
  | 'wonderGuard'       // 효과굉장 아니면 x0
  | 'desolateLand'      // 물 공격 x0
  | 'primordialSea'     // 불 공격 x0

// (B) 등장: 날씨/필드 설치 / 자신 부스트 / 표식
export type EntryAbilityEffect =
  | { kind: 'setWeather'; weather: WeatherId }
  | { kind: 'setTerrain'; terrain: TerrainId }
  | { kind: 'selfBoost'; stat: StatId; delta: number }      // → Clue.rank{target:'secret'}
  | { kind: 'marker'; marker: 'intimidate' }

// (C) 상태기: 면역(특정/전체) / 반사
export type StatusAbilityEffect =
  | { kind: 'immune'; blocks: StatusId[] }      // blocks에 포함된 status는 immune
  | { kind: 'immuneAll' }                       // 비휘발성 주요 상태 immune, 혼란(휘발성) 제외 (purifying-salt/comatose)
  | { kind: 'reflect'; reflects: StatusId[] }   // synchronize: 반사 → marker('status-reflect')

// (D) 랭크기: 차단 / 반전 / 증폭 / 반응 / 반사
export type StatAbilityEffect =
  | { kind: 'block'; stats?: StatId[] }          // stats 미지정=전스탯하락 차단(delta→0). 지정=해당 스탯만
  | { kind: 'invert' }                           // contrary: 부호 반전
  | { kind: 'amplify'; factor: number }          // simple: ×2
  | { kind: 'react'; on: 'anyDrop'; stat: StatId; delta: number } // defiant/competitive
  | { kind: 'reflect' }                          // mirror-armor → marker('stat-reflect')
  | { kind: 'blockAndReact'; stat: StatId; delta: number }        // guard-dog: 차단+반응
```

> **설계 메모(domain-engineer 재량):** `AttackEffect`를 판별 유니온 한 칼럼으로 둘지(위 안), 트랙별 optional 슬롯에 직접 펼칠지는 구현 디테일. 권장은 위처럼 `attack`/`entry`/`status`/`stat` 슬롯 각각이 판별 유니온이고, 한 레코드가 복수 슬롯을 채울 수 있게 하는 것(다중 트랙 특성 = thermal-exchange, purifying-salt, water-bubble 처리). ADR 계약 타입(`Action`/`Clue`/시그니처)은 **변경 불가**, 레코드 타입은 자유.

### 3. ⭐ v1 화이트리스트 데이터 — 전수 명세

> 표기 규칙: `nameKo`는 권위 맵 값. "트랙"은 어느 해석기가 읽는지. **우리 StatId 5종(atk/def/spa/spd/spe)·StatusId 5종(burn/paralysis/confusion/poison/sleep) 밖의 효과는 v1 제외**(명중·풀죽음·매혹·도발·얼음상태 등)로 명시.

#### 3-A. 공격 트랙 — C1 타입면역 (11종, wind-rider 제외)

ADR (5): 흡수+랭크업 5종은 `absorbBoost`(x0 + rank), 나머지는 순수 `immuneType`(x0). wind-rider는 "바람기술 플래그" 무효라 "타입+분류" action 모델로 관측 불가 → **화이트리스트 제외**(ADR (5) 확정).

| slug | nameKo | 트랙 | AttackEffect | 비고 |
| --- | --- | --- | --- | --- |
| `levitate` | 부유 | A | `immuneType{immuneTo:'ground'}` | 순수 x0 |
| `water-absorb` | 저수 | A | `immuneType{immuneTo:'water'}` | 회복 부수효과는 v1 비관측 → 순수 x0 |
| `volt-absorb` | 축전 | A | `immuneType{immuneTo:'electric'}` | 회복 → 순수 x0 |
| `flash-fire` | 타오르는불꽃 | A | `immuneType{immuneTo:'fire'}` | 자기 불 강화=C5 성격 → 순수 x0 |
| `earth-eater` | 흙먹기 | A | `immuneType{immuneTo:'ground'}` | 회복 → 순수 x0 |
| `dry-skin` | 건조피부 | A | `immuneType{immuneTo:'water'}` **+** 부C2 불약점 | 물 x0 + 불 ×1.25 (아래 3-B에 `multiplier` 동반, 같은 레코드 2슬롯은 불가 → 정책 아래) |
| `sap-sipper` | 초식 | A | `absorbBoost{immuneTo:'grass', stat:'atk', delta:+1}` | 흡수랭크업 |
| `lightning-rod` | 피뢰침 | A | `absorbBoost{immuneTo:'electric', stat:'spa', delta:+1}` | 흡수랭크업 |
| `storm-drain` | 마중물 | A | `absorbBoost{immuneTo:'water', stat:'spa', delta:+1}` | 흡수랭크업 |
| `motor-drive` | 전기엔진 | A | `absorbBoost{immuneTo:'electric', stat:'spe', delta:+1}` | 흡수랭크업 |
| `well-baked-body` | 노릇노릇바디 | A | `absorbBoost{immuneTo:'fire', stat:'def', delta:+2}` | 흡수랭크업 |

> **dry-skin 처리(판단필요 항목 — 해소):** dry-skin은 물 x0(C1) **이면서** 불 ×1.25(C2)다. `AttackEffect`가 한 슬롯이라 둘을 동시에 못 담는다. **권장: `immuneType`에 선택적 `damageModifier?: {appliesToTypes, factor}` 필드를 추가**하거나, attack 슬롯을 `AttackEffect[]`(배열)로 둔다. 후자가 더 일반적(`[{immuneType water},{multiplier fire 1.25}]`). domain-engineer는 attack 슬롯을 `AttackEffect | AttackEffect[]`로 허용해 dry-skin/water-bubble 같은 복합을 표현한다. ADR 계약과 무관(내부 표현).

#### 3-B. 공격 트랙 — C2 배율보정 (선언적 `multiplier`)

타입 단독 조건이라 데이터로 선언 가능. factor는 곱해질 인자.

| slug | nameKo | 트랙 | AttackEffect | 비고 |
| --- | --- | --- | --- | --- |
| `thick-fat` | 두꺼운지방 | A | `multiplier{appliesToTypes:['fire','ice'], factor:0.5}` | 불·얼음 0.5x |
| `heatproof` | 내열 | A | `multiplier{appliesToTypes:['fire'], factor:0.5}` | 불 0.5x |
| `purifying-salt` | 정화의소금 | A | `multiplier{appliesToTypes:['ghost'], factor:0.5}` **+** 상태면역(3-E `immuneAll`) | 고스트 0.5x; 다중 트랙 |
| `dry-skin` | 건조피부 | A | `multiplier{appliesToTypes:['fire'], factor:1.25}` | 위 3-A 물면역과 같은 레코드(배열 슬롯) |
| `water-bubble` | 수포 | A | `multiplier{appliesToTypes:['fire'], factor:0.5}` **+** 화상면역(3-E) | 불 0.5x(방어측); 물 2x는 C5(공격측)라 v1 제외; 다중 트랙 |

#### 3-C. 공격 트랙 — C2 계산의존 (명명 술어 `predicate`)

데이터는 `predicate` 이름만, 계산은 predicates.ts(4절).

| slug | nameKo | 트랙 | predicate | 술어 의미 |
| --- | --- | --- | --- | --- |
| `filter` | 필터 | A | `filter` | 효과굉장(타입배율>1) → ×0.75 |
| `solid-rock` | 하드록 | A | `filter` | 동일 |
| `prism-armor` | 프리즘아머 | A | `filter` | 동일 |
| `multiscale` | 멀티스케일 | A | `multiscale` | (풀피 가정) ×0.5 |
| `shadow-shield` | 스펙터가드 | A | `multiscale` | 동일 |
| `ice-scales` | 얼음인분 | A | `iceScales` | 특수기 ×0.5 |
| `fur-coat` | 퍼코트 | A | `furCoat` | 물리기 ×0.5 |
| `fluffy` | 복슬복슬 | A | `fluffy` | 접촉기 ×0.5 + 불 ×2 — **접촉 여부 관측불가 → 4절 정책** |
| `wonder-guard` | 불가사의부적 | A | `wonderGuard` | 효과굉장 아니면 x0 |
| `desolate-land` | 끝의대지 | A | `desolateLand` | 물 공격 x0 (+등장 3-D 날씨) |
| `primordial-sea` | 시작의바다 | A | `primordialSea` | 불 공격 x0 (+등장 3-D 날씨) |

> **제외(C2 표에 있으나 v1 비관측):** `marvel-scale`(상태시 방어1.5x — 상태선행 필요=C5성격), `grass-pelt`(그래스필드 의존=C7), `punk-rock`(소리기=move플래그). 모두 단발 "타입+분류" 모델 밖 → 화이트리스트 제외.

#### 3-D. 등장 트랙 — C7 설치 13종 + C4

보강1(a) 13종 + C4 자신부스트/표식. 같은 `entry` 트랙.

| slug | nameKo | 트랙 | EntryAbilityEffect | 비고 |
| --- | --- | --- | --- | --- |
| `drought` | 가뭄 | B | `setWeather{weather:'sun'}` | |
| `orichalcum-pulse` | 진홍빛고동 | B | `setWeather{weather:'sun'}` | 자기 공격강화=C5 → 설치만 노출 |
| `drizzle` | 잔비 | B | `setWeather{weather:'rain'}` | |
| `sand-stream` | 모래날림 | B | `setWeather{weather:'sandstorm'}` | |
| `snow-warning` | 눈퍼뜨리기 | B | `setWeather{weather:'snow'}` | |
| `desolate-land` | 끝의대지 | B | `setWeather{weather:'harsh-sun'}` | +공격술어 3-C |
| `primordial-sea` | 시작의바다 | B | `setWeather{weather:'heavy-rain'}` | +공격술어 3-C |
| `grassy-surge` | 그래스메이커 | B | `setTerrain{terrain:'grassy'}` | |
| `electric-surge` | 일렉트릭메이커 | B | `setTerrain{terrain:'electric'}` | |
| `psychic-surge` | 사이코메이커 | B | `setTerrain{terrain:'psychic'}` | |
| `misty-surge` | 미스트메이커 | B | `setTerrain{terrain:'misty'}` | |
| `hadron-engine` | 하드론엔진 | B | `setTerrain{terrain:'electric'}` | 자기 특공강화=C5 → 설치만 |
| `delta-stream` | 델타스트림 | B | **판단필요(아래)** | 날씨 `deltastream`이 WeatherId에 없음 |
| `intimidate` | 위협 | B | `marker{marker:'intimidate'}` | C4 표식 |
| `intrepid-sword` | 불요의검 | B | `selfBoost{stat:'atk', delta:+1}` | → rank(target:'secret') |
| `dauntless-shield` | 불굴의방패 | B | `selfBoost{stat:'def', delta:+1}` | → rank(target:'secret') |
| `download` | 다운로드 | B | **판단필요(아래)** | 상대 의존(유저 포켓몬 없음) |

> **delta-stream 처리(판단필요 — 해소 제안):** delta-stream의 날씨 `deltastream`(난기류)은 ADR `WeatherId`('sun'|'rain'|'sandstorm'|'snow'|'harsh-sun'|'heavy-rain')에 **없다**. ADR을 바꾸지 않으려면 두 옵션: (1) **v1 등장 단서에서 delta-stream 제외**(WeatherId 확장은 ADR 계약 변경이므로 임의 변경 금지 → 7절 위험요소로 보고). (2) 부수 효과(비행 약점 무효)만 공격 술어로… 그러나 이는 "정답이 방어자일 때 비행 공격 배율 보정"이라 관측 가능하긴 함. **권장: v1은 (1) 제외**(WeatherId 미정의 + 보유 1종 + 부수효과는 C5/광역 성격). ADR 결정(1)의 WeatherId에 'strong-winds'(난기류)를 추가할지는 **형님/ADR 재검토 사항**으로 7절에 적고 임의로 안 고침.
>
> **download 처리(판단필요 — 해소 제안):** download는 "상대 방어/특방 비교해 공격 or 특공 +1"인데 **유저 포켓몬(상대)이 없어 어느 쪽이 오를지 결정 불가**. 옵션: (1) **v1 제외**(결정 입력 부재). (2) `marker`로 "다운로드 계열 등장"만 노출. ADR EntryAbilityEffect엔 marker가 `'intimidate'`만 있음 → marker로 내려면 `Clue.marker` 유니온 확장 필요(ADR 계약 변경). **권장: v1 제외**(intimidate처럼 전용 marker를 추가하는 건 ADR `Clue` 변경이라 임의 불가 → 7절 보고). domain-engineer는 download를 화이트리스트에서 **생략**(폴백=등장 단서 없음).

#### 3-E. 상태기 트랙 — 보강2 상태면역/반사

**우리 StatusId 5종(burn/paralysis/confusion/poison/sleep)에 매핑되는 것만.** 매핑 안 되는 효과(풀죽음·매혹·도발·얼음상태·명중 등)는 v1 **제외**.

| slug | nameKo | 트랙 | StatusAbilityEffect | 비고 |
| --- | --- | --- | --- | --- |
| `limber` | 유연 | C | `immune{blocks:['paralysis']}` | |
| `water-veil` | 수의베일 | C | `immune{blocks:['burn']}` | |
| `thermal-exchange` | 열교환 | C | `immune{blocks:['burn']}` | +C3 피격랭크(3-F) 다중 트랙 |
| `water-bubble` | 수포 | C | `immune{blocks:['burn']}` | +C2 불0.5x(3-B) 다중 트랙 |
| `own-tempo` | 마이페이스 | C | `immune{blocks:['confusion']}` | 풀죽음·위협면역은 v1 밖 |
| `insomnia` | 불면 | C | `immune{blocks:['sleep']}` | |
| `vital-spirit` | 의기양양 | C | `immune{blocks:['sleep']}` | |
| `sweet-veil` | 스위트베일 | C | `immune{blocks:['sleep']}` | 아군조건 무시(정답 자신에 적용) |
| `immunity` | 면역 | C | `immune{blocks:['poison']}` | 맹독=poison으로 통합(v1 StatusId에 'toxic' 없음) |
| `pastel-veil` | 파스텔베일 | C | `immune{blocks:['poison']}` | |
| `purifying-salt` | 정화의소금 | C | `immuneAll` | 비휘발성만(혼란 제외) +C2 고스트0.5x 다중 트랙 |
| `comatose` | 절대안깸 | C | `immuneAll` | 비휘발성 주요 상태만(혼란 제외) |
| `synchronize` | 싱크로 | C | `reflect{reflects:['burn','paralysis','poison']}` | **sleep·confusion 반사 안함**(showdown: slp/frz/기타 제외). → marker('status-reflect') |

> **v1 제외(StatusId 밖, 명시):**
> - `inner-focus`(정신력): 풀죽음 면역 — 풀죽음은 v1 StatusId 아님 → **제외**.
> - `oblivious`(둔감): 매혹·도발 면역 — v1 StatusId 밖 → **제외**.
> - `magma-armor`(마그마의무장): 얼음(frozen) 면역 — v1 StatusId에 'frozen' 없음(ADR 확정 5종) → **제외**.
> - `aroma-veil`(아로마베일): 매혹·도발·앵콜 등 — v1 StatusId 밖 → **제외**.
> - `leaf-guard`(리프가드): **쾌청 날씨 조건부** 전상태 면역 — v1엔 "현재 날씨" 맥락이 없음(단발). 무조건 면역으로 내면 거짓 단서 → **v1 제외**(7절 위험요소). 날씨 맥락 도입 시 재고.
> - `flower-veil`(플라워베일): 풀타입 아군 한정 — 조건부, 부분관측 → **v1 제외**(거짓 단서 위험).
> - `shields-down`(리밋실드): 폼(HP) 조건부 면역 → **v1 제외**(폼 상태 맥락 없음).
> - `corrosion`(부식) 등 "면역 무시" 공격측 특성은 C5 → 대상 아님.
>
> **혼란(confusion) 관측원 확인(Codex #3 정정):** v1 confusion을 막는 화이트리스트는 `own-tempo` **단 1종**이다. `immuneAll`(정화의소금·절대안깸)은 **비휘발성(주요) 상태만** 막고 **혼란(휘발성)은 못 막는다** → 혼란 행동엔 정상 적용. (showdown: purifyingsalt/comatose는 `onSetStatus`만, `onTryAddVolatile`(혼란) 없음.)

#### 3-F. 랭크기 트랙 — 보강3 랭크반응 (14종)

v1 대표 행동 = `{stat:'def', stages:-1}`(꼬리흔들기, 방어-1). 각 특성이 **def-1 입력에 어떻게 반응하는지** 명세. 적용 순서(ADR (5)): **차단 > 반전/증폭 > 반응**.

| slug | nameKo | 트랙 | StatAbilityEffect | def-1 입력 시 결과 |
| --- | --- | --- | --- | --- |
| `clear-body` | 클리어바디 | D | `block{}` (전스탯) | `rank delta 0` |
| `white-smoke` | 하얀연기 | D | `block{}` | `rank delta 0` |
| `full-metal-body` | 메탈프로텍트 | D | `block{}` | `rank delta 0` |
| `big-pecks` | 부풀린가슴 | D | `block{stats:['def']}` | def하락만 차단 → `delta 0` |
| `hyper-cutter` | 괴력집게 | D | `block{stats:['atk']}` | def-1엔 무반응(atk만 차단) → **Clue 생략**(폴백=정상 -1) |
| `defiant` | 오기 | D | `react{on:'anyDrop', stat:'atk', delta:+2}` | def-1 적용 + `atk+2` |
| `competitive` | 승기 | D | `react{on:'anyDrop', stat:'spa', delta:+2}` | def-1 적용 + `spa+2` |
| `contrary` | 심술꾸러기 | D | `invert` | `def+1`(하락→상승) |
| `simple` | 단순 | D | `amplify{factor:2}` | `def-2` |
| `guard-dog` | 파수견 | D | `blockAndReact{stat:'atk', delta:+1}` | `def delta 0`(차단) + `atk+1`(반응) |
| `mirror-armor` | 미러아머 | D | `reflect` | `marker('stat-reflect')`(델타 대상 없음) |
| `keen-eye` | 날카로운눈 | D | **명중하락만 차단 → v1 제외** | def-1엔 무반응 → 화이트리스트 제외(아래) |
| `illuminate` | 발광 | D | **명중하락만 차단 → v1 제외** | 동일 |
| `minds-eye` | 심안 | D | **명중하락만 차단 → v1 제외** | 동일 |

> **keen-eye/illuminate/minds-eye 처리(판단필요 — 해소):** 이 3종은 **명중(accuracy) 하락만** 차단한다. v1 StatId(atk/def/spa/spd/spe)에 **accuracy가 없다**. v1 대표 행동(def-1)에 이들은 **무반응**이므로 화이트리스트에 넣어도 폴백(정상 -1)과 동일한 결과 → **데이터로는 넣되 `block{stats:[]}`(아무 스탯도 안 막음=실질 무효과)로 두거나 아예 생략**. 권장: **화이트리스트 제외**(v1 행동셋으로 관측 불가, 명중 행동이 v1에 없음). accuracy를 StatId에 추가하는 건 ADR 변경 → 임의 불가(7절). domain-engineer는 이 3종을 abilities.ts에서 **생략**(폴백).
>
> **guard-dog 적용순서 실증:** ADR 검증 항목 "차단>반응"을 위해 guard-dog은 단일 `blockAndReact`로 두되, 해석기 내부에서 차단(delta 0)을 먼저 산출하고 반응(atk+1)을 더해 **두 Clue 모두** 방출. (clear-body류 단순 차단과 구분.)
>
> **제외(보강3에 있으나 부적합):** `unaware`(천진)는 "계산 시 상대 랭크 무시"라 단발 단서 부적합(notes 명시) → 제외.

#### 3-G. C3 피격랭크 — 공격 트랙 부수 랭크 (타입/분류 조건부)

> ⚠️ **ADR 계약 정합성 경고(7절 핵심):** ADR 트랙 매핑표는 **(A) 공격 트랙의 산출 Clue를 `damage` + (흡수랭크업 한정) `rank`로 한정**한다. C3 피격랭크(weak-armor 등)는 "피격 시 자신 랭크변화"로 **공격 트랙에서 `rank`를 내야** 하는데, ADR의 (A)트랙 `rank` 산출을 **"흡수랭크업 특성 한정"**으로 명시적으로 좁혀놨다. 즉 **C3 피격랭크는 현재 ADR 트랙 매핑표 문구상 (A)트랙의 합법 산출이 아니다.** PRD 기능요구 (A)에는 C3 피격랭크가 포함되고 ADR 검증 항목에도 weak-armor 테스트가 있어 **PRD·검증 vs ADR 트랙표 사이에 표현 충돌**이 있다. → **7절 위험요소로 보고. 임의로 ADR 트랙표를 안 고침.** domain-engineer 착수 전 형님 확인 필요. (해소 방향 후보: ADR 트랙표의 (A)행을 "`damage` + `rank`(흡수랭크업·C3피격랭크)"로 문구 확장 — 이는 ADR 수정이라 architect가 임의 결정 불가.)

아래는 **충돌이 해소(=C3 피격랭크가 (A)트랙 합법 산출로 승인)될 경우**의 명세다. 트리거 조건 미스 시 해당 `rank` Clue **생략**(ADR "조건 미스=생략" 규약).

| slug | nameKo | 트리거(타입/분류) | 출력 rank | 대상 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `weak-armor` | 깨어진갑옷 | 물리 피격 | `def-1` + `spe+2` | secret(자신) | 대표 테스트 |
| `rattled` | 주눅 | 악/고스트/벌레 피격 | `spe+1` | secret | 타입 미스(노말 등)=생략 |
| `justified` | 정의의마음 | 악 피격 | `atk+1` | secret | |
| `water-compaction` | 꾸덕꾸덕굳기 | 물 피격 | `def+2` | secret | |
| `steam-engine` | 증기기관 | 불/물 피격 | `spe+6` | secret | |
| `thermal-exchange` | 열교환 | 불 피격 | `atk+1` | secret | +화상면역(3-E) 다중 트랙 |
| `stamina` | 지구력 | (무조건 피격) | `def+1` | secret | 타입조건 없음 |
| `cotton-down` | 솜털 | (무조건 피격) | **상대 spe-1** | **상대(없음)** | 판단필요(아래) |
| `gooey` | 미끈미끈 | 접촉 피격 | **상대 spe-1** | **상대(없음)** | 판단필요(아래) |
| `tangling-hair` | 컬리헤어 | 접촉 피격 | **상대 spe-1** | **상대(없음)** | 판단필요(아래) |

> **gooey/tangling-hair/cotton-down 처리(판단필요 — 해소 제안):** 효과 대상이 **상대(공격자)**인데 유저 포켓몬이 없어 델타 대상이 없다. ADR 정신(상대 재타깃=marker)에 따르면 표식이 맞으나, ADR `Clue.marker` 유니온은 `'intimidate'|'status-reflect'|'stat-reflect'`만이고 "피격 시 상대 속도-1" marker가 없다. 새 marker 추가는 ADR `Clue` 변경. 또한 gooey/tangling-hair는 **접촉 여부**(move 플래그)에 의존하는데 v1 action은 "타입+물리/특수"라 **접촉 관측 불가**(fluffy와 동일 한계). **권장: 3종 모두 v1 제외**(① 상대 대상=델타 불가, ② 접촉=관측불가(gooey/tangling-hair), ③ 새 marker=ADR 변경). cotton-down은 접촉 무관(무조건)이나 여전히 "상대 대상"이라 marker 외 표현 불가 → 동일하게 **v1 제외**. 7절에 보고. domain-engineer는 abilities.ts에서 생략.
>
> **그 외 C3 제외(부수효과가 단발 모델 밖):** anger-point(급소), aftermath/innards-out/perish-body(기절), sand-spit/seed-sower(날씨/필드 설치=등장 아닌 피격), wind-power/electromorphosis(충전 표식=C5), toxic-debris(설치). 모두 v1 제외.

#### 3-H. C4 기타 등장 — as-one 류

| slug | nameKo | 처리 |
| --- | --- | --- |
| `as-one-glastrier` | 혼연일체 | 긴장감(Unnerve=나무열매봉인, 비관측) + 백의울음(Chilling Neigh=기절시 자공격↑, C5). **위협 아님** → 관측 가능 효과 없어 **v1 제외**. |
| `as-one-spectrier` | 혼연일체 | 긴장감(Unnerve) + 사신의말(Grim Neigh=기절시 자특공↑, C5). 둘 다 비관측 → **v1 제외**. |
| `supersweet-syrup` | 감미로운꿀 | 첫 등장 상대 회피-1 → 상대 대상 + accuracy/evasion(StatId 밖) → **v1 제외**. |
| `frisk`/`anticipation`/`trace`/`forewarn`/`curious-medicine` | 통찰 등 | 정보 공개·복사·초기화=C8(비관측) → **v1 제외**. |

> **as-one 판단(2026-06-18 정정):** As One은 **위협이 아니다.** 글라스티어=긴장감(Unnerve)+백의울음(Chilling Neigh), 스펙트리어=긴장감+사신의말(Grim Neigh). Unnerve(나무열매봉인)는 v1 비관측, 백의울음/사신의말(기절시 자스탯↑)은 C5라 비관측. **글라스티어·스펙트리어 모두 v1 제외**(관측 가능 효과 없음 → 화이트리스트 미포함=안전 폴백). 적대 검증(showdown asoneglastrier 핸들러 대조)으로 초기 "위협 합성" 판단이 오류였음을 확인·정정.

#### 화이트리스트 레코드 총계 (트랙별)

| 트랙 | 포함 레코드 수 | 슬러그 |
| --- | --- | --- |
| A 공격-C1면역 | 11 | levitate, water-absorb, volt-absorb, flash-fire, earth-eater, dry-skin, sap-sipper, lightning-rod, storm-drain, motor-drive, well-baked-body |
| A 공격-C2선언 | 5 | thick-fat, heatproof, purifying-salt, dry-skin*, water-bubble |
| A 공격-C2술어 | 11 | filter, solid-rock, prism-armor, multiscale, shadow-shield, ice-scales, fur-coat, fluffy, wonder-guard, desolate-land, primordial-sea |
| B 등장 | 15 | drought, orichalcum-pulse, drizzle, sand-stream, snow-warning, desolate-land*, primordial-sea*, grassy-surge, electric-surge, psychic-surge, misty-surge, hadron-engine, intimidate, intrepid-sword, dauntless-shield |
| C 상태기 | 13 | limber, water-veil, thermal-exchange*, water-bubble*, own-tempo, insomnia, vital-spirit, sweet-veil, immunity, pastel-veil, purifying-salt*, comatose, synchronize |
| D 랭크기 | 11 | clear-body, white-smoke, full-metal-body, big-pecks, hyper-cutter, defiant, competitive, contrary, simple, guard-dog, mirror-armor |
| A 공격-C3피격랭크 (충돌 해소 조건부) | 7 | weak-armor, rattled, justified, water-compaction, steam-engine, thermal-exchange*, stamina |

> `*`=다중 트랙(같은 슬러그가 여러 트랙 슬롯을 채움). **고유 슬러그 수 ≈ 60종**(dry-skin·purifying-salt·thermal-exchange·water-bubble·desolate-land·primordial-sea가 다중 카운트). ADR (6)의 "약 60~70종" 예측과 정합. C3 7종은 ADR 트랙표 충돌(3-G·7절) 해소 시 추가.

### 4. 명명 술어 (predicates.ts)

ADR (3) escape hatch. 입력은 `(action, secret, typeMultiplier)` — `typeMultiplier`는 attack 해석기가 이미 계산한 순수 타입 배율(getEffectiveness 결과). 출력은 "곱할 인자" 또는 `0`(무효) 또는 `null`(해당 없음).

| 술어 | 입력 맥락 | 반환 | v1 단순화 정책 |
| --- | --- | --- | --- |
| `filter` | typeMultiplier | typeMultiplier>1 → `0.75`, else `1` | filter/solid-rock/prism-armor 공유 |
| `multiscale` | (HP 맥락 없음) | 항상 `0.5` | **HP 풀피 가정**(judge엔 secret만, HP 없음 → "정답은 항상 풀피"로 단순화). 7절 위험. |
| `iceScales` | action.category | special → `0.5`, else `1` | |
| `furCoat` | action.category | physical → `0.5`, else `1` | |
| `fluffy` | action.attackType (+접촉) | 불 → `2`; 접촉 → `0.5` | **접촉 여부 관측불가** → v1은 **불 ×2만 적용**(접촉 0.5는 미적용=폴백). 또는 fluffy 전체 제외. 7절 판단. |
| `wonderGuard` | typeMultiplier | typeMultiplier>1 → `1`(통과), else → `0`(무효) | 효과굉장만 통과, 나머지 x0 |
| `desolateLand` | action.attackType | water → `0`, else `1` | |
| `primordialSea` | action.attackType | fire → `0`, else `1` | |

> **맥락 부재 정책(핵심 단순화):** judge는 `(action, secret)`만 받고 "정답의 현재 HP·이전 행동" 같은 동적 맥락이 없다(단발). 따라서:
> - **multiscale/shadow-shield**: "정답 풀피 가정" → 항상 ×0.5. (실배틀과 다를 수 있으나 단발 모델의 결정론적 단순화. ADR 검증·UI는 이 가정 위에서 동작.)
> - **filter/wonder-guard**: "효과굉장 여부"는 secret.candidate.types + action.attackType으로 **judge 시점에 계산 가능**(getEffectiveness) → 맥락 부재 아님, 정확.
> - **fluffy**: 접촉 여부는 move 플래그라 action 모델 밖 → 불 ×2만(접촉 0.5 생략) 또는 fluffy 제외. **권장: fluffy 제외**(부분 관측이 거짓 단서 위험 — 접촉기인데 0.5 안 줌 = 잘못된 배율). 7절.

### 5. 트랙 해석기 + 오케스트레이터

```ts
// 각 해석기: 자기 트랙이 아니면 [] 반환 (레지스트리 균일화)
function interpretAttack(action, secret): readonly Clue[]   // action.kind!=='attack' → []
function interpretEntry(secret): readonly Clue[]            // entryClues 전용
function interpretStatus(action, secret): readonly Clue[]   // action.kind!=='status' → []
function interpretStat(action, secret): readonly Clue[]     // action.kind!=='stat' → []

// index.ts
const ATTACK_LIKE_TRACKS = [interpretAttack, interpretStatus, interpretStat]
export function judge(action, secret): readonly Clue[] {
  return ATTACK_LIKE_TRACKS.flatMap(t => t(action, secret))
  // C5 seam: ATTACK_LIKE_TRACKS 에 interpretOffense 추가만으로 확장 (코어 무수정)
}
export function entryClues(secret): readonly Clue[] {
  return interpretEntry(secret)
}
```

**책임 분담:**
- `interpretAttack`: ① getEffectiveness(타입배율) ② 화이트리스트 조회(secret.ability.slug) ③ C1면역(immuneType/absorbBoost→multiplier 0 [+rank]) ④ C2 multiplier(factor 곱) ⑤ predicate(predicates.ts 호출, 곱/0) ⑥ C3피격랭크 → `damage` + 선택 `rank`. 화이트리스트 밖이면 순수 타입배율만(안전 폴백). **C3 피격랭크는 최종 multiplier>0(실제 적중)일 때만 방출**(면역 x0이면 억제=거짓 단서 차단, Codex #3). 단 absorbBoost의 x0+rank는 흡수 메커니즘이라 유지.
- `interpretEntry`: 화이트리스트 entry 슬롯 → `entry`(setWeather/setTerrain) / `rank{target:'secret'}`(selfBoost) / `marker('intimidate')`. 없으면 `[]`.
- `interpretStatus`: action.status가 immune blocks/immuneAll → `status{result:'immune'}`; reflect 대상 → `marker('status-reflect')`; 화이트리스트 밖/미해당 → `status{result:'applied'}`(폴백).
- `interpretStat`: 적용순서 **차단(block/blockAndReact)→반전(invert)/증폭(amplify)→반응(react/blockAndReact)→반사(reflect→marker)**. 화이트리스트 밖 → `rank{delta:입력 stages}`(정상 적용 폴백).
- **C5 seam**: `interpretOffense`(미구현)를 주석/타입(`Clue.offense` placeholder)으로만 표시. 레지스트리에 추가 자리.

### 6. 테스트 계획 (Vitest, ADR `## 검증` 전 항목 매핑)

스타일은 `src/data/typechart.test.ts`(describe/it 한국어, `toBe`/`toContain`) 따름. 배율은 근사 비교(`toBeCloseTo` 또는 epsilon). **픽스처는 실재 포켓몬**(아래 검증된 id 사용).

| ADR 검증 항목 | 테스트 | 픽스처(실재) |
| --- | --- | --- |
| 공격 타입배율 | 불→풀=2, 불→물=0.5, 불→(풀·벌레)=4, 불→(물·바위)=0.25 | 임의 타입 조합 candidate |
| thick-fat 0.5 | thick-fat 정답에 불=0.5 | `venusaur-mega`(grass/poison, thick-fat) |
| x0 통합 | 전기→땅(타입면역) == 부유 정답+땅(특성면역) == multiplier 0 | 부유: `gastly`(ghost/poison, levitate) / 땅타입: 임의 |
| wonder-guard | 비효과굉장 공격=0 | `shedinja`(bug/ghost, wonder-guard) |
| primordial-sea/desolate-land | 불/물 공격=0 | 보유 candidate |
| C3 조건 매칭/미스 | weak-armor 물리=def-1·spe+2, 특수=rank 생략; rattled 노말=생략 | `onix`(rock/ground, weak-armor) / rattled 보유 |
| 흡수랭크업 | 피뢰침+전기=multiplier 0 **+** rank(spa+1); 저수+물=0만 | `pikachu`(electric, lightning-rod) / `poliwag`(water, water-absorb) |
| 등장 | drought=weather:'sun', grassy-surge=terrain:'grassy', intrepid-sword=rank(atk+1), intimidate=marker | drought/grassy-surge/intrepid-sword 보유 / `ekans`(intimidate) |
| 상태기 | 전기자석파→limber=paralysis immune, 도깨비불→water-veil=burn immune, →synchronize=marker('status-reflect'), 화이트리스트밖=applied | limber/water-veil 보유 / `abra`(synchronize) |
| 랭크기 | 꼬리흔들기(def-1)→clear-body=delta 0, →defiant=atk+2, →contrary=def+1, →mirror-armor=marker('stat-reflect'), →guard-dog=delta 0 + atk+1 (차단>반응 둘 다) | clear-body/defiant/contrary/mirror-armor/guard-dog 보유 |
| C5 비관측 경계 | guts 정답+도깨비불 → burn applied, "공격강화" 단서 없음 | `rattata`(normal, guts) |
| 안전 폴백 | 배율 비변경 미지원 특성 → 거짓 단서 없이 기본 판정 | 화이트리스트 밖 특성 candidate |
| 확장성 ① | 기존 술어 재사용 신규 특성 화이트리스트 1행 추가 → 단서 나옴, 코어/해석기 미수정 | 테스트용 가짜 레코드 주입 또는 미사용 실재 특성 |
| 확장성 ② | 새 명명 술어 동반 특성 추가 → 술어 1개 추가, 트랙 해석기 시그니처·코어 미수정 | predicates.ts 확장 회귀 |
| 순수성 | 동일 입력 반복 호출 동일 결과(`toEqual`), 반환 readonly | 임의 |
| 의존방향/fetch0 | import 그래프 검사(엔진→data만), 런타임 fetch 0 | 정적 검사 + lint |
| nameKo 정합 | 화이트리스트 전 레코드 nameKo가 권위 맵과 일치, 누락 0 | abilities.test.ts |

> **추가 경계 테스트(ADR (5) 적용순서):** contrary+simple 동시 보유는 불가(특성 1개)지만, block>invert>react 순서는 guard-dog(차단+반응)으로 실증. simple(증폭 ×2)과 contrary(반전)는 각각 단독 테스트.

### 7. 위험 요소 (미해결 판단필요 항목)

> **architect는 ADR을 임의로 바꾸지 않는다.** 아래는 domain-engineer 착수 전 형님/ADR 확인이 필요한 항목이다.

1. **🔴 ADR 트랙표 vs PRD/검증 충돌 (C3 피격랭크) — 최우선.** ADR "트랙→Clue kind 매핑"표의 (A)공격 트랙은 `rank` 산출을 **"흡수랭크업 특성 한정"**으로 명시한다. 그러나 PRD 기능요구 (A)와 ADR 검증 항목은 **weak-armor 등 C3 피격랭크(`def-1·spe+2`)를 공격 트랙에서 요구**한다. 즉 C3 피격랭크가 (A)트랙의 합법 산출인지 ADR 본문 문구상 모순. → **C3 7종(weak-armor/rattled/justified/water-compaction/steam-engine/thermal-exchange/stamina)을 (A)트랙 합법 산출로 승인할지** ADR 트랙표 문구 확장이 필요(architect 임의 결정 불가). **미해소 시 C3 피격랭크 7종은 구현 보류.**

2. **상대 대상 효과(gooey/tangling-hair/cotton-down/download/as-one-spectrier/supersweet-syrup).** 효과 대상이 "상대(공격자/시전자)"인데 유저 포켓몬이 없어 델타 대상이 없다. ADR `Clue.marker` 유니온은 intimidate/status-reflect/stat-reflect만이라 "피격 시 상대 속도-1"·"다운로드"용 marker가 **없다**. 새 marker 추가는 ADR `Clue` 변경. **권장 처리: 전부 v1 제외(생략)**. (as-one류도 위협이 아니라 긴장감+백의울음/사신의말=비관측·C5라 제외 — 위 3-H 정정 참조.)

3. **HP 맥락 부재(multiscale/shadow-shield).** judge는 정답 HP를 모른다(단발). **"항상 풀피 가정" ×0.5**로 단순화 제안. 실배틀과 불일치하나 결정론 유지. ADR 검증엔 multiscale 항목이 없어 영향 작음(형님 확인 권장).

4. **접촉 여부 관측불가(fluffy/gooey/tangling-hair).** v1 action="타입+물리/특수"라 move의 contact 플래그를 모른다. **fluffy는 접촉 0.5 미적용 시 거짓 배율 위험 → fluffy 전체 v1 제외 권장**(불 2x만 살리면 접촉기일 때 틀린 단서). gooey/tangling-hair는 위 2번으로 이미 제외.

5. **StatId/StatusId 셋 밖 효과 제외 경계.** accuracy/evasion(keen-eye·illuminate·minds-eye·supersweet-syrup), 풀죽음(inner-focus), 매혹·도발(oblivious·aroma-veil), frozen(magma-armor)은 v1 StatId(5)·StatusId(5)에 없어 **전부 제외**. 이를 화이트리스트에 넣으면 "관측 가능한 척" 거짓 단서 위험 → 생략이 안전.

6. **WeatherId에 없는 날씨(delta-stream=난기류).** ADR WeatherId 6종에 'deltastream/strong-winds' 없음. **v1 delta-stream 등장 단서 제외 권장.** WeatherId 확장은 ADR 결정(1) 변경 → 임의 불가.

7. **leaf-guard/flower-veil/shields-down 조건부 면역.** 날씨(쾌청)·풀타입·폼 조건에 의존하는데 단발 모델에 그 맥락이 없다. 무조건 면역으로 내면 거짓 단서 → **v1 제외**. 조건 맥락 도입 시 재고.

8. **데이터 정확성.** 화이트리스트 슬러그·nameKo·트랙 분류는 위 C1~C3·보강 표 + 권위 ko맵에 근거하나, showdown 핸들러 재해석이라 domain-engineer는 abilities.test.ts에서 nameKo 정합(권위 맵 대조)·슬러그 실재(데이터셋 308종 내)를 자동 검증해야 한다. 다중 트랙 특성(dry-skin/purifying-salt/thermal-exchange/water-bubble/desolate-land/primordial-sea)의 슬롯 누락 주의.

> **종합:** 핵심 충돌은 **#1(C3 피격랭크 ADR 트랙표 모순)**. 이것만 형님/ADR 확인되면 나머지(#2~#7)는 "v1 제외/단순화"로 거짓 단서 없이 안전 폴백 가능. 화이트리스트 고유 슬러그 ≈60종(C3 7종 포함 시), 트랙별 레코드는 위 총계표 참조.
