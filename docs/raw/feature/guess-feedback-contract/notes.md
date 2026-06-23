# Notes: 추측/피드백 계약 및 정답 은닉 아키텍처

Date: 2026-06-19 Asia/Seoul
Unit type: feature
Status: draft

## 맥락

- 엔진(`src/engine`)이 `Clue`를 생성하지만, 데일리 루프(정답 선정·세션·추측/피드백)가 없어 게임이 성립 안 됨. 이 계층이 그 루프의 headless 도메인.
- 정답 후보 모수: `src/data`가 단일 출처(현재 1209 = base 1023 + forms 186). 작은 풀이라 정적 은닉이 브루트포스에 취약.

## 결정

- **형님 결정(2026-06-19): 정적 SPA 채택 — Squirdle처럼 정답 탈취를 감수한다.** 진짜 은닉(서버/Edge Function)은 v1 비목표.
- 단 엔진 ADR의 "엔진=완전한 단서 / 노출=전송 계층 책임" 분리를 살려, **Clue-only provider 경계(로컬 구현)** 를 둬 미래 서버 승급을 어댑터 교체로 만든다(C-lite). v1 채택 여부는 PRD 열린질문(형님 취사).
- 데일리 선정은 candidate **+ ability까지** 결정론. 추측 입력은 candidate id(이름 매핑은 battle-turn-ui). UTC 자정 앵커 + `min(local,utc)` 타임존 클램프.
- **추측 예산·턴 모델 확정(형님 2026-06-19): 추측 무제한 + 행동·이름추측 통합 1-move 카운트 + 정답까지의 move 수를 점수로 기록(포케맨틀식). 실패 상태 없음**(정답 시에만 종료). 많은 추측은 점수 페널티로 자기억제 → 별도 횟수 제한 불필요.
- **provider 시드 v1 채택 여부는 ADR에서 결정**(형님).

## 검증

- 데이터 모수: `node -e "require('./src/data/meta.json').totalCandidates"` → 1209 (worktree=origin/main 기준; 메인 체크아웃 stale 1213 주의).
- 엔진 계약: `src/engine/types.ts`의 `judge(action,secret)`/`entryClues(secret)`·`Secret={candidate,ability}`·`Action`/`Clue` 확인 — provider가 `Secret`을 내재해 호출 캡슐화.
- 정답 비노출 불변식은 **인터페이스/직렬화 경계** 한정(번들·메모리 평문은 탈취 감수 비목표).

## 후속 작업

- ADR(경량): 정적 무은닉+provider 시드 결정 기록(선택지 A/B/C·근거). → `$adr-helper`.
- (추측 예산·턴 모델은 형님 확정 완료 — 위 「결정」 참조.)
- 미래 은닉 승급 시: provider를 Cloudflare Pages+Functions+Workers KV 어댑터로 교체(레퍼런스 조사 권장).
- **전단사 무중복 범위(구현 후 명기, 2026-06-19)**: 데일리 전단사는 **사이클 정렬 N일 윈도**(N=후보수≈1209 → 약 3.3년) 한정이다. 임의 연속 N일이 사이클 경계를 가로지르면 독립 순열 둘이 만나 근접 재등장이 가능하나, 경계는 ≈3.3년마다라 실질 무해(ADR이 트레이드오프로 인지). 테스트는 사이클 정렬 윈도에서 distinct===N으로 검증. 임의-윈도 무중복까지 원하면 사이클 간 순열 합성(글로벌 인덱싱)으로 후속 강화 가능.

## 레퍼런스 조사

조사일: 2026-06-19. 대상: poke-battle-quiz (하루 1회 정답 포켓몬 + 가능 특성 1개를 배틀 단서로 추론하는 데일리 퍼즐). React+TS+Vite 정적 SPA 지향, 솔로 개발. 후보군 ~1209(작음 → 브루트포스 취약). 배틀 판정 엔진(judge/entryClues→Clue) 이미 머지됨. 결정 사항: 정답 은닉을 (A) 서버/Edge Function으로 빼느냐 / (B) 정적 SPA로 탈취 감수하느냐 / (C) 계약+mock 시드 먼저 가느냐.

### 1) 갈래별 핵심 결론

**갈래 1 — 서버리스/Edge Function 무료 티어 비교(2026)**
- 후보 ~1209는 정적 SPA에 정답을 실으면 단일 조회로 즉시 탈취(브루트포스조차 불필요). "오늘 정답이 누구냐"만 서버 뒤로 숨기고 클라는 추측 POST → 서버가 judge 엔진으로 Clue/정오답만 반환하는 구조가 정석.
- **Cloudflare Pages + Pages Functions + Workers KV**가 솔로·무료·정적 SPA 결합에 가장 가벼움: 정적 빌드(./dist) + functions/ 동일 프로젝트 배포 → 별도 백엔드·CORS·도메인 분리 0. 정답키 `answer:YYYY-MM-DD`(UTC)를 KV에 사전 시드, `context.env.KV`로 서버에서만 읽음.
- 무료 한도(2026 공식): Workers 요청 100k/day, CPU 10ms/invocation. KV 읽기 100k/day, **쓰기 1k/day**(정답은 사전 시드라 무해), 저장 1GB. 한도 초과 시 과금 없이 조용히 중단.
- 경쟁 플랫폼 함정: Vercel Hobby(1M invocations지만 '비상업용 전용' 약관 + KV는 Upstash 유료 결합), Supabase Edge(500k/월이나 **7일 비활성 시 프로젝트 일시정지** → 데일리 게임에 독), Netlify(2025말 크레딧제 전환으로 함수 컴퓨트가 300크레딧 공용풀에 묶여 예측성↓), Deno Deploy(1M req·KV 1GiB 매력적이나 정적 SPA 호스팅 결합 매끄러움 약함).
- 출처: developers.cloudflare.com/workers/platform/pricing/ · cloudflare.com/plans/developer-platform/ · developers.cloudflare.com/pages/functions/bindings/ · developers.cloudflare.com/kv/ · vercel.com/pricing · vercel.com/docs/functions/limitations · supabase.com/docs/guides/functions/limits · docs.deno.com/deploy/pricing_and_limits/ · netlify.com/blog/introducing-netlify-free-plan/

**갈래 2 — 데일리 추론게임 실전 은닉 아키텍처(선례)**
- 두 갈래: (1) **정적 SPA 평문 누수형** — Wordle 원본·Costcodle·대부분 ~dle 클론은 전체 정답표 + 날짜→인덱스 함수를 번들/JSON으로 클라에 내려 오늘+미래 정답이 평문 노출, 판정도 클라. (2) **서버 응답 피드백 전용형** — Pokémantle은 백엔드가 secret을 쥐고 /guess는 추측명만 받아 유사도/랭크만 반환, 정답 id/name은 승리 전까지 절대 안 실음.
- **은닉의 본질 = 응답에 '판정/단서만' 싣고 '정답 식별자'를 빼는 것.** 서버로 옮겨도 후보군이 작으면 한 판에 전 후보 제출 → rank-1 응답으로 1일치 정답이 털림. 즉 서버화는 '소스 평문 노출'은 막지만 '무제한 브루트포스'는 별도(시도 제한)로 막아야 함.
- Costcodle: `fetch('./games.json')`으로 전 일자 정답 평문 수신, 인덱스는 startDate 경과일 계산 → 미래 정답까지 노출. Squirdle(포켓몬·데일리·8턴 다축 피드백)은 순수 클라 판정/로컬 상태. 쌍근(자모 분해 다축 부분일치)도 클라 판정이라 은닉 강도는 클라형 한계.
- 출처: ahmadawais.com/wordle-solved-reverse-engineering-and-hacking-wordle/ · github.com/KermWasTaken/costcodle · squirdle.fireblend.com/daily.html · github.com/yf-dev/pokemantle · pokemantle.update.sh/ · ssaangn.com/

**갈래 3 — 정적 클라 전용 은닉의 암호학적 한계(적대적 검증)**
- **"정적 SPA만으로 진짜 은닉 불가"가 사실.** 클라가 정답을 검증할 수 있다면 정답을 푸는 정보가 클라에 반드시 존재(검증 능력과 은닉은 양립 불가).
- 후보 1209는 작아 솔트 없는 해시/암호화는 1209회 선계산(<1초) 한 번으로 daily→정답 역매핑 테이블이 영구 완성 → 무력. 솔트(commit-reveal)는 브루트포스를 막지만 순수 클라·오프라인이면 솔트가 그날 번들/메모리에 있어야 해 추출됨('verification IS revealing' 패러독스). 이를 푸는 유일한 순수-클라 경로는 ZK-SNARK이나 솔로·캐주얼 데일리엔 과도.
- 선례는 모두 '진짜 비밀=서버'로 수렴: 원조 Semantle은 word2vec.db를 웹루트 밖에 두고 REST 서빙, NYT는 Wordle 인수 후 정답을 서버 API로 이관. Nerdle 분석 결론: 정적 클라 암호화는 cheating-tolerant이지 cheating-proof 아님(난독화는 '수고 비용 올리기'일 뿐).
- 리더보드·경쟁·상금 없는 캐주얼 데일리에선 탈취 감수가 업계에서 널리 용인(자기 재미 깎는 자해, 타인 피해 없음).
- 출처: hackaday.com/2022/02/08/wordle-reverse-engineering-and-automated-solving/ · andrej.hashnode.dev/commit-reveal-scheme · medium.com/@an0ndev/breaking-pro-nerdle-puzzle-generation-theyre-encrypted-apparently-b6d129734bee · en.wikipedia.org/wiki/Semantle · gitlab.com/novalis_dt/semantle

**갈래 4 — 추측제한·rate-limit·타임존 클램프·솔로 운영 비용**
- **추측 횟수 제한이 1차 방어선**: Wordle 6회, Squirdle 8회. 유한 시도는 '클루 오라클 정보 누수'를 구조적으로 봉인 — 무제한+rate-limit은 분산 IP/봇넷으로 우회되므로 세션/계정 단위 + 횟수 상한 병행 필요.
- Wordle 선례 경로: 초기 전체 정답 클라 내장 → NYT가 서버 API(`/svc/wordle/v2/{YYYY-MM-DD}.json`)로 이관. 보안 연구자 권고: "최악의 경우 정답이 정답 맞힐 때까지 서버를 떠나지 않게 하라."
- **반례 Squirdle**: poke-battle-quiz와 거의 동형(포켓몬·데일리·8턴·속성 클루)인데도 순수 정적/무계정으로 인기 운영 중 → 캐주얼 퍼즐은 정답 탈취를 치명적으로 보지 않음.
- 타임존: 정답키를 UTC 자정 앵커(Semantle 패턴) + 클라에서 `min(localDate, utcDate)` 클램프 → 시계 앞당김으로 미래 퍼즐 선취 차단. 단 정적 SPA는 정답을 못 숨기므로 클램프는 '선취 방지' 한정 효과.
- 정적 구현 정석: 런치 epoch day index를 seed로 seedable PRNG(xmur3+mulberry32) → 후보 인덱스 선택 → 전세계 동일 퍼즐, localStorage에 day index 키로 진행상태.
- 출처: medium.com/@owenyin/here-lies-wordle-2021-2027-full-answer-list-52017ee99e86 · siliconangle.com/2022/12/19/api-vulnerabilities-wordle-exposed-answers-opened-door-potential-hacking/ · squirdle.fireblend.com/daily.html · semantle.com/ · arxiv.org/pdf/1811.08528

### 2) 결정 매트릭스

| 기준 | A. 풀서버/Edge Function | B. 정적 SPA 탈취감수 | C. 하이브리드(은닉가능 계약+mock 먼저, Edge 후속) |
|---|---|---|---|
| **은닉강도** | 높음 — 정답이 서버를 안 떠남(Semantle/NYT Wordle 검증 패턴). 단 브루트포스는 시도제한 병행 필요 | **없음→낮음** — 1209 후보는 선계산 1회로 역매핑 영구 완성, 미래 정답까지 평문 노출. 난독화는 '우연한 스포일러 방지'만 | 시작은 B 수준(mock=클라), Edge 승급 시 A 수준. 계약이 은닉 위치를 흡수 |
| **개발비용** | 높음 — KV 바인딩·시드·엔드포인트·서버 judge 실행 선투자 | 최저 — 정적 빌드만, 서버 0 | 중간 — answer provider 인터페이스 + mock 구현 먼저(서버 0), Edge는 나중 1개만 |
| **유지보수** | 중상 — 배포·KV 슬롯(prod/preview 분리)·시드 운영 지속 | 최저 — 정적 호스팅, 장애면 없음 | 낮음→중 — v1은 정적 수준, 승급 후 Edge 1개만 관리 |
| **운영리스크** | 중 — Cloudflare는 한도초과 시 과금 없이 중단(오프라인 위험 낮음). Supabase/Vercel/Netlify는 일시정지·약관 함정 | 최저 — 서버 의존 0 | 낮음 — 정적 출시로 초기 리스크 0, 옵션만 보존 |
| **데일리무결성** | 높음 — 서버가 그날 정답만 내려줌, 선취 원천 차단 + 시도 횟수 서버 강제 | 낮음 — 미래 퍼즐 클라 계산 가능, 클램프는 부분 방어뿐 | 시작 낮음→승급 시 높음. 유한 시도 + UTC 클램프로 무결성 보강 |
| **UX** | 좋음 — 단 콜드스타트·네트워크 의존(추측마다 왕복) | 최상 — 오프라인 동작·즉시 응답 | 좋음 — mock은 즉시 응답, 승급 후에도 단서만 왕복 |
| **솔로적합성** | 낮음 — 선투자·운영부담이 솔로엔 과대 | 높음 — 가장 싸나 은닉 포기 | **최고** — 초기 비용·리스크 최소 + 미래 은닉 옵션 보존, 되돌리기 쉬움 |

### 3) 권장과 근거

**권장: C 하이브리드 — "은닉 가능한 계약 + mock 어댑터 먼저, Edge Function은 후속".**

근거:
- **후보군 작음(1209)이 결정적 변수.** 클라 전용 해시·AES·솔트는 모두 선계산/번들 추출로 무력(갈래 3 적대적 검증). 따라서 '진짜 은닉'이 필요하면 정답 판정의 최종 경계는 서버일 수밖에 없다 — 그러나 그것을 v1에 강제하면 솔로·무료·정적 지향과 충돌(갈래 1·4).
- **엔진 ADR이 "엔진 = 완전한 단서 생성 / 은닉 = 전송 계층 책임"으로 분리해둔 점과 정확히 연결된다.** judge/entryClues→Clue는 이미 순수 단서 생성을 담당하므로, 남은 일은 '정답 제공(answer provider)'과 '응답 계약(Clue-only)'을 전송 계층 인터페이스로 격리하는 것뿐. 이 계약만 박으면 클라(mock)든 서버(Edge)든 인터페이스가 안 바뀐다(Pokémantle GuessResult=점수+랭크-only가 모범).
- **계약의 철칙: 응답에 정답 식별자(dexId/nameKo/특성)를 절대 싣지 않고 Clue(판정 등급/방향)만 싣는다.** 이것이 은닉의 본질(갈래 2). 이 계약이 고정되면 은닉 위치 결정(A vs B)을 블로킹하지 않고 늦출 수 있다.
- **v1은 정적 mock으로 게임 루프 완성·테스트 → 무료 호스팅(Cloudflare Pages) 출시**, 추측 횟수를 유한(예 8~10턴)으로 못 박아 브루트포스 1차 방어. Squirdle이 동형 구조로 순수 정적 인기 운영 중이라는 반례가 v1 풀서버 과투자를 경계하게 한다.
- **미래에 리더보드·부정신고가 실제 문제가 되면** 격리해 둔 provider를 Cloudflare Pages Function(KV 정답 조회 + judge 서버 실행)으로 교체해 '정답은 맞히기 전까지 서버를 안 떠난다'(Wordle 보안권고)로 승급. 이 순서가 재작업·비용·운영 리스크를 모두 최소화한다.
- 이 결정(은닉 위치·플랫폼 후보 Cloudflare·계약 우선 전략)은 ADR로 남길 가치가 있다.

### 4) PRD 결정 경계로 넘길 열린 질문

- **추측 횟수 N**: 6(Wordle) / 8(Squirdle) / 10 중 무엇? 배틀 단서의 정보량(4트랙 Clue)이 풍부하므로 N을 줄여도 풀이 가능한지 정보이론적 검토 필요. 이 값이 브루트포스 1차 방어선의 강도를 결정.
- **세션/진행상태 위치**: localStorage(클라) vs 서버 KV/쿠키. 정적 v1은 localStorage 불가피, 승급 시 중복방지·횟수강제를 서버로 올릴지.
- **데일리 선정 위치**: 정적 결정론(epoch day index → xmur3+mulberry32 → 후보 인덱스) vs 서버 KV 사전 시드. C 경로는 provider 인터페이스 뒤로 숨겨 둘 다 수용.
- **타임존 클램프 정책**: 정답키 UTC 자정 앵커 + `min(localDate, utcDate)` 클램프 채택 여부. 리셋 기준(로컬 자정 vs UTC 자정)을 PRD에 명문화.
- **은닉 목표 수준 명시**: '캐주얼 부정 억지(우연한 스포일러 방지)' vs '진짜 방지'. 이 선언이 A/B/C 사이 승급 트리거 조건을 규정한다.
- **응답 계약 스키마 확정**: 서버/mock 공통 응답 = judge 출력 Clue 형태로 고정. 정답 식별자 비노출 불변식을 계약 테스트로 강제할지.
