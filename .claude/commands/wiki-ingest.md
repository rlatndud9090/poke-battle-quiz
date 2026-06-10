# /wiki-ingest <raw-unit-path>

Update `docs/wiki/index.md` through the shared harness.

Use:

```sh
npm run harness:ingest -- $ARGUMENTS
```

The command must be idempotent and may only update `docs/wiki/index.md`.

The canonical protocol is `docs/harness/protocols/wiki-ingest.md`.
