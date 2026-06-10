# UI 검증 프로토콜

UI 레이아웃, 상호작용, 반응형 동작이 바뀌었을 때 사용한다. 이 문서는
메일 에디터의 CSS 검증을 그대로 가져온 것이 아니다. 포켓몬 퀴즈 플랫폼의
화면 품질을 검증하는 최소 강한 기준이다.

## 적용 대상

- 앱 쉘, 모드 선택, navigation, dashboard
- battle log, command panel, guess UI
- responsive layout
- 버튼, 입력, 탭, 상태 badge 같은 상호작용 요소

## 검증 기준

- 모바일/데스크톱 폭에서 텍스트가 겹치지 않는다.
- 버튼/탭/입력의 의미가 role/name으로 드러난다.
- planned mode와 playable mode가 시각적으로 구분된다.
- 모드 전환이 전역 레이아웃을 깨지 않는다.
- 빈 상태, placeholder, disabled 상태가 자연스럽다.
- 도메인 규칙을 UI 컴포넌트에 숨겨 넣지 않는다.

## 권장 절차

1. 관련 컴포넌트 테스트 또는 smoke 테스트를 작성한다.
2. 필요하면 dev server를 실행한다.
   ```sh
   npm run dev -- --host 127.0.0.1
   ```
3. desktop과 mobile viewport를 확인한다.
4. screenshot 또는 관찰 결과를 notes에 남긴다.
5. `npm run harness:gate`를 실행한다.

## 실패 모드

- **나쁨:** 화면을 "예쁘게" 만들었지만 planned/playable 상태가 구분되지 않는다.
- **좋음:** 사용자가 지금 플레이 가능한 모드와 예정 모드를 즉시 구분한다.

- **나쁨:** shell이 battle mode 전용 copy와 layout으로 굳어진다.
- **좋음:** mode registry가 늘어나도 shell 구조가 유지된다.
