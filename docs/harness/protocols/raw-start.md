# Raw 시작 프로토콜

작업 단위가 확정된 뒤 raw source를 생성할 때 사용한다. 작업 단위가 아직
정해지지 않았다면 먼저 `work-intake.md`와 `prd-drafting.md`를 사용한다.

## 목적

- branch 이름과 raw path를 1:1로 맞춘다.
- 작업 시작 시 PRD/ADR/notes의 위치를 고정한다.
- 이후 wiki ingest, artifact check, commit trailer가 같은 work unit id를
  가리키게 만든다.

## 브랜치 규칙

```txt
feature/<kebab-case-purpose>
bugfix/<kebab-case-purpose>
chore/<kebab-case-purpose>
```

좋은 예:

```txt
feature/quiz-platform-shell
feature/ability-trigger-system
bugfix/stat-stage-clamp
chore/intake-helper-harness
```

나쁜 예:

```txt
feature/update
feature/misc
bugfix/fix
chore/work
```

## 명령

현재 브랜치가 유효하면 type과 slug를 추론한다.

```sh
npm run harness:start -- --title "퀴즈 플랫폼 쉘"
```

`main`에서 미리 만들 때는 명시한다.

```sh
npm run harness:start -- --type feature --slug quiz-platform-shell --title "퀴즈 플랫폼 쉘"
```

## 생성 파일

| type | 생성 파일 |
| --- | --- |
| `feature` | `prd.md`, `adr.md`, `notes.md` |
| `bugfix` | `bugfix.md`, `notes.md` |
| `chore` | `notes.md` |

chore라도 프로젝트 방향이나 하네스 정책을 바꾸면 PRD/ADR을 추가할 수 있다.

## 완료 조건

```sh
npm run harness:ingest -- docs/raw/<type>/<slug>
npm run harness:check
```

`harness:check`는 현재 브랜치와 raw path가 맞는지 확인한다.
