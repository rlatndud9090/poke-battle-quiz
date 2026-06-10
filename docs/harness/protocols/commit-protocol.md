# Commit Protocol

This project uses the Lore Commit Protocol from `AGENTS.md`.

## Before Commit

1. Run `npm run harness:gate` or the equivalent sequence.
2. Stage only the files that belong to the work unit.
3. Inspect `git diff --staged`.
4. Include the raw unit path in the commit body or a `Related:` trailer.

Avoid broad staging commands when unrelated files exist. Prefer explicit paths.

## Message Shape

```txt
<intent line: why this change exists>

<context and rationale>

Constraint: <external constraint>
Rejected: <alternative> | <reason>
Confidence: <low|medium|high>
Scope-risk: <narrow|moderate|broad>
Directive: <future-facing warning>
Tested: <verification performed>
Not-tested: <known gap>
Related: docs/raw/<type>/<slug>/
Co-authored-by: OmX <omx@oh-my-codex.dev>
```

Use trailers that add value. `Co-authored-by: OmX <omx@oh-my-codex.dev>` is
required by the local hook.
