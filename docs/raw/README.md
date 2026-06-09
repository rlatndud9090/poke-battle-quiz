# Raw Notes

Raw notes are grouped like branch work units.

Use one raw note per meaningful unit of work:

- `feature/` for product or capability work.
- `bugfix/` for defect investigation and fixes.
- `chore/` for setup, repository hygiene, docs, tooling, and maintenance.

File naming convention:

```txt
docs/raw/<unit-type>/<yyyy-mm-dd>-<short-topic>.md
```

Raw notes should capture durable facts and decisions for that unit. Keep them
public-safe: do not include credentials, local-only clone details, private paths,
or unnecessary third-party source-code provenance.
