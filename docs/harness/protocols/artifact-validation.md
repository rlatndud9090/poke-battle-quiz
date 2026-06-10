# Artifact Validation Protocol

Use this before integration and commit.

```sh
npm run harness:check
```

The check verifies:

- `docs/wiki/` contains only `index.md`.
- Wiki links to raw files resolve.
- Work branches named `feature/*`, `bugfix/*`, or `chore/*` have a matching raw
  directory.
- Feature raw units contain `prd.md` and `adr.md`.
- Markdown files with frontmatter include required fields:
  `title`, `date`, `status`, and `unit_type`.
- Raw and wiki files remain public-safe.

Historical date-prefixed raw directories are accepted as legacy records, but new
work should use branch-derived slugs.

Dependency exact-version pinning is not enforced yet. Add a separate ADR before
turning that policy into a failing gate.
