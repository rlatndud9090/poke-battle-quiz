# Work Intake Protocol

Use this when the user starts with an open prompt such as:

```txt
이제 뭐하지?
다음에 뭐 하면 좋을까?
이 아이디어를 작업 단위로 쪼개줘
```

This protocol stops before code implementation. It turns project context and user
intent into a small set of actionable work-unit candidates.

## Context Loading

1. Read `AGENTS.md`.
2. Read `docs/wiki/index.md`.
3. Read the raw units that define current product and architecture direction.
4. Inspect the current code only enough to avoid stale recommendations.

## Output

Return 3 to 5 candidate work units.

Each candidate must include:

- `type`: `feature`, `bugfix`, or `chore`.
- `branch`: `feature/<kebab-slug>`, `bugfix/<kebab-slug>`, or
  `chore/<kebab-slug>`.
- `raw path`: `docs/raw/<type>/<slug>/`.
- `title`: human-readable work title.
- `why now`: why this is timely.
- `scope`: what belongs in the unit.
- `non-scope`: what should not be included.
- `risk`: main uncertainty or coupling.

Then recommend one candidate as the next work unit.

## Rules

- Prefer small work units that can be implemented, verified, and committed
  independently.
- Avoid vague branch slugs such as `feature/update` or `chore/misc`.
- If the idea is too broad, split it before recommending a branch.
- If product direction is unclear, ask only the smallest set of questions needed
  to draft a useful PRD.
- Do not run `harness:start` until the user accepts or clearly asks to proceed
  with a candidate.

## Follow-Up

After a candidate is accepted, run the PRD drafting protocol.
