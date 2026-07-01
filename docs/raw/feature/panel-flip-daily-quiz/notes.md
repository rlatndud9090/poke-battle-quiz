# Notes: 패널 플립 데일리 퀴즈 코어

Date: 2026-06-30 Asia/Seoul
Unit type: feature
Status: research + drafting

## 맥락

- 사용자는 기존 배틀 시뮬레이션형 퀴즈 컨셉을 "복잡도가 과하다"는 이유로 재검토했고,
  더 단순하고 직관적인 패널 플립형 데일리 추론 게임으로 방향 전환을 원했다.
- 확정된 패널 구성은 27개다.
  - 타입 패널 18개
  - 안다리걸기 1개
  - 비스트부스트 1개
  - 진화의휘석 1개
  - 메가스톤 1개
  - 다이맥스 1개
  - 타이틀 4개(`SwSh`, `LA`, `SV`, `ZA`)
- 점수는 `패널 뒤집기 횟수 + 포켓몬 이름 추측 시도 수`이며, 낮을수록 좋다.
- 첫 버전은 이 점수 구조 위에 **총 12회 공유 예산**을 둔다.
- 사용자는 "전 포켓몬 지원 가능 시 이 컨셉대로 구현"을 선호했다.

## 리서치 요약

### 외부 선행 사례

- **Pokémantle**
  - 출처: [pokemantle.update.sh](https://pokemantle.update.sh/)
  - 관찰: "하루 한 번, 모두가 같은 답을 푸는" 데일리 구조를 핵심 가치로 둔다.
  - PRD 연결: 이 프로젝트도 하루 1회 같은 퍼즐을 공유하는 루프를 유지하는 근거가 된다.

- **Squirdle Daily**
  - 출처: [squirdle.fireblend.com/daily.html](https://squirdle.fireblend.com/daily.html)
  - 관찰: 포켓몬 이름 자체를 직접 맞히되, 타입/세대/키/몸무게 같은 구조화된 속성 힌트로 추론한다.
  - PRD 연결: 이 프로젝트가 "전투 시뮬레이션"보다 "구조화된 속성 힌트 공개" 쪽으로
    단순화하더라도 데일리 추론 경험으로 성립할 수 있다는 근거가 된다.

### 내부 제약 및 재사용 자산

- **현재 후보군**
  - 출처: `src/data`, `docs/raw/feature/pokemon-data-contract/prd.md`
  - 관찰: 프로젝트는 이미 전 세대 candidate universe를 정적 데이터로 보유하며,
    타입/특성이 다른 일부 폼도 별도 candidate로 포함한다.
  - PRD/ADR 연결: 새 컨셉도 이 자산을 재사용하되, candidate universe 전체를 그대로
    정답풀로 쓰지 않고 panel game용 eligible subset을 별도로 정의하는 쪽이 적절하다.

- **폼 정책 재검토**
  - 관찰: 기존 데이터 계약은 타입/특성 차이만 있으면 폼을 별도 candidate로 살린다.
  - 사용자 판단: 메가진화 가능 여부를 패널로 주는 이상 메가진화체 자체를 정답으로 넣는 건
    함정처럼 느껴질 수 있다. 비스트부스트 패널 때문에 스탯이 다른 폼이 구분 가능하더라도,
    킬가르도 stance나 펌킨인 size 분화처럼 "이름 맞히기"보다 subform 맞히기에 가까운
    후보는 첫 버전에서 빼는 편이 낫다.
  - ADR 연결: panel game은 "안정적이고 플레이어가 별도 정답으로 납득할 수 있는 폼"만
    eligible answer pool에 남긴다.

- **현재 데일리 정답 구조**
  - 출처: `src/session/dailyAnswer.ts`, `docs/raw/feature/guess-feedback-contract/prd.md`
  - 관찰: 프로젝트는 이미 날짜별 결정론 정답과 local session 복원 구조를 갖고 있다.
  - PRD 연결: 패널 게임도 새 정답 시스템을 만드는 대신, 이 데일리 구조를 재사용하는
    것이 가장 작은 변경이다.

- **패널 메타데이터 생성 가능 근거**
  - 출처: 로컬 Pokémon Showdown reference data(`pokedex`, 세대별 `formats-data`)
  - 관찰: Showdown 데이터에는 몸무게(`weightkg`), 종족값(`baseStats`), 진화 가능 여부(`evos`), 거다이맥스 가능 여부(`canGigantamax`), 작품별 존재 여부 판단에 쓸 `isNonstandard` 정보가 있다.
  - 제약: candidate id와 Showdown id가 완전히 일치하지 않는 케이스가 있어 alias 정리가 필요하다.
  - ADR 연결: 런타임 조회가 아니라 생성 단계 정적 메타데이터 공급이 현실적이라는 근거가 된다.

### 패널 세트 식별력 전수조사

- 분석 대상
  - 현재 candidate universe `1209`
  - 내부 비밀 상태 `(candidate, ability)` `2703`
- 전수조사 결과
  - 패널 전체 시그니처 기준 최대 동치류 크기: `4`
  - `10턴 제한`을 가정한 greedy 분기 실험에서 worst-case 비용: `10`
  - hardest leaf 예시: `pineco`, `rellor`, `scatterbug`, `spewpa`, `tarountula`
- 해석
  - 현재 패널 세트는 "너무 약해서 후보를 못 좁히는 구조"는 아니다.
  - 다만 이 분석의 `10`은 **가장 최적화된 패널 선택 전략이 존재할 때의 하한에 가깝다**.
  - 실제 플레이어는 최적 결정 트리를 그대로 따르지 않으므로, 첫 버전 제품 규칙은
    완충을 두어 **12회 공유 예산**으로 잡는다.
  - PRD 연결: 첫 버전은 점수형 루프를 유지하되, 12회 소진 시 실패하는 구조로 정의한다.

## 검증

- `src/data`와 `src/session/dailyAnswer.ts`가 이미 재사용 가능한 headless 자산인지 확인
- 27개 패널 세트에 대한 전수조사 결과 확인
- `docs/raw/feature/guess-feedback-contract/prd.md`의 기존 무제한 추측 루프와
  새 12회 공유 예산 루프의 차이를 분리해 검토
- Showdown reference data가 패널 메타데이터 생성 근거로 충분한 필드를 갖는지 확인

## 후속 작업

- PRD 초안 확정
- 패널 메타데이터 생성 경로와 세션 shape를 ADR로 결정
- 승인 후 `feature-develop`에서 코어 구현 착수
