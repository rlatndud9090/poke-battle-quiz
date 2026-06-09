# Decision: LLM Wiki Harness

Status: active
Category: decision
Last updated: 2026-06-09
Sources: `docs/raw/2026-06-09-session-bootstrap.md`, `AGENTS.md`, `reference/llm-wiki-pattern.md`

## Decision

Use a Karpathy-style LLM Wiki for project memory.

The project has three knowledge layers:

1. Raw sources under `docs/raw/`.
2. LLM-maintained wiki pages under `docs/wiki/`.
3. Project-local schema and entrypoint in `AGENTS.md`.

Future agents must read `docs/wiki/index.md` and `docs/wiki/log.md` at session
start, then follow relevant linked pages before making durable decisions.

## Rationale

This project is expected to evolve through discussion: product feel, quiz
mechanics, Pokemon data choices, ability-trigger architecture, UI decisions, and
implementation tradeoffs. Chat history alone is fragile across sessions.

The wiki creates a maintained project memory that compounds instead of forcing
each new session to rediscover the same context.

## Constraints

- Raw sources should be append-only.
- Wiki pages are LLM-writable and may be revised when new evidence arrives.
- Evidence and inference must be separated.
- Runtime OMX logs should not become project knowledge unless they contain a
  durable decision.
- The project-local wiki lives under `docs/wiki/` and raw sources live under
  `docs/raw/` so non-OMX agents can read them and `.omx/` remains runtime-only.

## Rejected Alternatives

- Only use chat history: rejected because context is easy to lose across sessions.
- Only use `docs/session-handoff.md`: rejected because a single handoff becomes
  stale and does not naturally support cross-linked architecture knowledge.
- Use runtime RAG only: rejected because it re-derives knowledge at query time
  instead of compiling stable synthesis into project files.
- Store the wiki under `.omx/`: rejected because it mixes durable project memory
  with OMX runtime state and is less obvious to non-OMX agents.

## Maintenance Rule

When a conversation changes project direction, create or append a raw source note,
update the smallest relevant wiki page, update `index.md` when navigation changes,
and append `log.md`.
