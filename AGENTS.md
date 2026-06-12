# AGENTS.md — Tally (Antigravity / Gemini lane)

You are the **volume lane** on a two-tool repo (Antigravity + Claude Code). Read `docs/PLAN.md` and `PROGRESS.md` before any work. Model: Gemini only (never route to Claude models here).

## Session protocol

1. Execute exactly ONE package per run — the one named in PROGRESS.md (or given by the user). Stop when its acceptance criteria pass.
2. Confirm the package is lane **AG**. If it's **CC**, stop and tell the user to switch to Claude Code.
3. Respect the Phase ownership map in PLAN.md. Never edit CC-owned directories (`/src/lib`, and others per phase). Consume their public APIs only. If an API seems wrong or missing, do NOT change it — file the issue in PROGRESS.md §Blockers and stop that thread.
4. End of run, always: tests pass → commit (conventional message) → push → update PROGRESS.md (done/next/decisions/blockers).

## Quality rules

- SPEC (`docs/SPEC.md`) is law: stack frozen, scope §OUT is forbidden territory, design tokens from `/src/styles/tokens.css` — no new fonts, colors, or CSS frameworks.
- UI must match the POC interaction patterns named in SPEC §Screens; verify on a 390px viewport.
- For UI packages, produce browser-subagent artifacts (screenshots / short recordings of the flow) into `/docs/qa/` and reference them in the commit.
- Tests live in `/tests`; aim for behavior tests against public APIs, not implementation details.

## Docs duty (this lane owns documentation)

- Keep `/docs` current as you build: any screen or flow you ship gets its section the same session.
- README is yours: install, screenshots, architecture sketch, contributing.
- Confluence is a one-way mirror of `/docs` (package P4.3). Repo markdown is the single source of truth — never author content in Confluence first.

## Git habits (non-negotiable)

Commit + push after every completed task. PROGRESS.md updated in the final commit of every run. Never leave the repo dirty.
