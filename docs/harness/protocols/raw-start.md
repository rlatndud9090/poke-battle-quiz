# Raw Start Protocol

Use this when starting a new feature, bugfix, or chore.

If the work unit is not decided yet, use `work-intake.md` and `prd-drafting.md`
first.

## Branch Convention

Create or switch to a branch named:

```txt
feature/<kebab-case-purpose>
bugfix/<kebab-case-purpose>
chore/<kebab-case-purpose>
```

The slug must communicate the core work. Avoid vague names such as `misc`,
`update`, `changes`, `fix`, or `work`.

## Command

```sh
npm run harness:start -- --type feature --slug ability-trigger-system --title "Ability trigger system"
```

When run on a valid work branch, `harness:start` can infer the type and slug from
the branch name. On `main`, pass `--type` and `--slug` explicitly.

## Output

- `feature/*`: creates `prd.md`, `adr.md`, and `notes.md`.
- `bugfix/*`: creates `bugfix.md` and `notes.md`.
- `chore/*`: creates `notes.md`.

Durable chore decisions may add `prd.md` and `adr.md` manually when the work
changes project process or architecture.

## Completion

After the raw unit is ready, run:

```sh
npm run harness:ingest -- docs/raw/<type>/<slug>
npm run harness:check
```
