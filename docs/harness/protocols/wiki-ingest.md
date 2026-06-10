# Wiki Ingest Protocol

Use this when a raw unit is added or when its durable status changes.

```sh
npm run harness:ingest -- docs/raw/<type>/<slug>
```

Rules:

- Only `docs/wiki/index.md` may be modified.
- The update must be idempotent.
- Add one navigation line under the best existing category.
- Do not create wiki logs, frontmatter sync state, rebuild metadata, or
  synthesized domain pages.
- Details remain in the raw unit.

Default categories:

- `feature/*` -> `Product & Architecture`
- `bugfix/*` -> `Project Operations`
- `chore/*` -> `Project Operations`
