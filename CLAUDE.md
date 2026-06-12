# CLAUDE.md — Tally

You are the **scalpel lane** on a two-tool repo (Claude Code + Antigravity/Gemini). Read `docs/PLAN.md` and `PROGRESS.md` before any work.

## Session protocol

1. Execute exactly ONE package per session — the one named in PROGRESS.md (or given by the user). Do not start the next one.
2. Before coding: confirm the package is lane **CC**. If it's **AG**, stop and tell the user to switch to Antigravity.
3. Respect the Phase ownership map in PLAN.md. Never edit AG-owned directories. If blocked by that, write the need in PROGRESS.md and stop.
4. End of session, always: tests pass → commit (conventional message, e.g. `feat(storage): idb schema v1`) → push → update PROGRESS.md (done/next/decisions/blockers) → suggest `/compact` or session close.

## Token discipline (user is on Pro — budget is scarce)

- Default model Sonnet. Switch `/model haiku` for renames, boilerplate, config churn, comment passes; switch back for logic.
- Read only files needed for the package. Do not crawl `/docs` or `/tests` unless the package requires it.
- No exploratory refactors, no drive-by improvements outside the package.
- If the user runs `/usage` and session budget < ~25%, recommend deferring to an AG package.

## Engineering rules

- Stack is frozen in `docs/SPEC.md` §Tech. Do not add dependencies without the user's explicit yes.
- `/src/lib` is pure and unit-tested; UI imports lib, never the reverse.
- Scope is frozen in SPEC §OUT. If a request drifts (OCR, CV, accounts, sync, notifications), name it as out-of-scope and point to the v1.1 parking lot — do not build it.
- Photos are Blobs in IndexedDB; never base64 strings in state or storage.
- All docs are markdown in `/docs`. Every architectural decision goes in PROGRESS.md §Decisions (one line each).

## Git habits (non-negotiable)

Commit + push after every completed task within the package, not only at the end. PROGRESS.md is updated in the final commit of every session. Never leave uncommitted work at session end.
