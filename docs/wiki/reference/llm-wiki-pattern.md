# Reference: Karpathy LLM Wiki Pattern

Status: active
Category: reference
Last updated: 2026-06-09
Sources:
- https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- https://gist.github.com/karpathy?direction=desc&sort=updated

## Summary

Andrej Karpathy's LLM Wiki pattern frames an LLM as a maintainer of a persistent
Markdown knowledge base. Instead of uploading documents and asking a model to
retrieve fragments at query time, the agent incrementally compiles raw sources
into a structured, interlinked wiki.

The original gist describes this as an idea file intended to be given to agents
such as Codex or Claude Code so they can build out the exact local workflow.

## Core Layers

1. Raw sources: curated input documents and records. These are the source of
   truth and should be immutable.
2. The wiki: LLM-generated Markdown pages such as summaries, concept pages,
   entity pages, comparisons, overviews, and syntheses. The LLM owns this layer.
3. The schema: an instruction file such as `AGENTS.md` or `CLAUDE.md` that tells
   the agent how the wiki is structured and how to ingest, query, and maintain it.

## Operational Implication

The key difference from ordinary RAG is accumulation. With RAG, the model often
rediscovers relevant chunks on every question. With an LLM Wiki, the synthesis,
cross-references, contradictions, and decisions are compiled once and then kept
current as sources and questions arrive.

## How This Project Adapts It

For Poke Battle Quiz:

- `AGENTS.md` is the schema.
- `docs/raw/` stores raw discussion captures and durable source notes.
- `docs/wiki/` stores compiled project knowledge.
- `docs/wiki/index.md` is the entrypoint for future sessions.
- `docs/wiki/log.md` records maintenance actions.

This is intentionally lightweight. There is no vector database or external
knowledge service. The first version is plain Markdown plus disciplined agent
behavior.
