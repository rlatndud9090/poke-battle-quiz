# 커밋 프로토콜

이 프로젝트는 `AGENTS.md`의 Lore Commit Protocol을 따른다. 커밋은 단순
라벨이 아니라 raw artifact와 연결되는 결정 기록이다.

## 커밋 전 조건

1. `npm run harness:gate` 통과.
2. `git status --short`로 변경 파일 확인.
3. 관련 파일만 명시적으로 stage.
4. `git diff --cached --check` 통과.
5. `git diff --cached`로 민감 정보와 범위 확인.

## 스테이징 규칙

권장:

```sh
git add src/domain docs/raw/feature/foo docs/wiki/index.md
```

주의:

- unrelated file을 stage하지 않는다.
- `.env`, local config, runtime log, 임시 파일을 stage하지 않는다.
- 넓은 `git add -A`는 작업트리가 완전히 이해된 경우에만 사용한다.

## 메시지 형식

```txt
<왜 이 변경을 했는지>

<맥락과 접근 이유>

Constraint: <제약>
Rejected: <기각한 대안> | <기각 이유>
Confidence: <low|medium|high>
Scope-risk: <narrow|moderate|broad>
Directive: <미래 수정자를 위한 지시>
Tested: <검증>
Not-tested: <검증하지 못한 것>
Related: docs/raw/<type>/<slug>/
Co-authored-by: OmX <omx@oh-my-codex.dev>
```

## 필수/권장 trailer

- `Tested:`는 반드시 실제 실행한 검증을 적는다.
- `Not-tested:`는 빈말로 쓰지 말고 알려진 공백을 적는다.
- `Related:`에는 raw unit 경로를 적는다.
- `Co-authored-by: OmX <omx@oh-my-codex.dev>`는 hook 요구사항이다.

## 실패 모드

- **나쁨:** "update docs" 같은 제목으로 맥락 없이 커밋한다.
- **좋음:** 왜 하네스나 기능 방향이 바뀌었는지 제목과 본문에 남긴다.

- **나쁨:** 검증하지 않았는데 `Tested: all`이라고 쓴다.
- **좋음:** `Tested: npm run harness:gate`, `Not-tested: browser smoke`처럼 정직하게 쓴다.
