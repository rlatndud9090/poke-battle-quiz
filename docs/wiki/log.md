# Wiki Maintenance Log

## 2026-06-09

- Created the project-local LLM Wiki harness under `docs/wiki/`.
- Added `AGENTS.md` as the schema and entrypoint for future agents.
- Captured the initial product intent, quiz hint engine direction, and LLM Wiki
  adoption request.
- Added the first architecture, decision, reference, and session-log pages.
- Updated public docs to point future sessions to `AGENTS.md` and
  `docs/wiki/index.md`.
- Removed the placeholder wiki link from `templates/page.md` so link checks only
  report real unresolved links.
- Moved durable project knowledge to `docs/wiki` and raw sources to `docs/raw`
  so the wiki is tool-agnostic and separated from runtime state.
- Captured the public GitHub publication request and added
  `environment/github-publication`.
- Captured completed publication facts for
  `https://github.com/rlatndud9090/poke-battle-quiz`.
- Reworked raw notes into feature/bugfix/chore unit directories and removed
  public docs that preserved unnecessary local reference-source details.
