# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot
- **Date:** 2026-06-13
- **Phase:** 0 — Foundation
- **Last completed:** P0.2 · Tooling (ESLint, Prettier, Vitest, CI setup) + App Renamed to Laundristic
- **Next package:** P1.1 · lane **CC** (Claude Code, Storage layer)
- **Repo state:** P0.2 completed locally; needs push.

## Decisions
- 2026-06-13 · App renamed from Tally to Laundristic in code and docs.
- 2026-06-13 · Standard Vite/React ESLint + Prettier + Vitest with jest-dom setup configured.
- 2026-06-13 · Design tokens in src/styles/tokens.css: Fraunces (display), Hanken Grotesk (body), paper/green palette per SPEC.
- 2026-06-13 · TypeScript strict mode enabled; paths configured for @/* alias (not yet used, prepared for later).
- 2026-06-12 · Two-lane workflow adopted: CC = scalpel (lib/domain/camera/missing-loop), AG = volume (UI/tests/docs/deploy). Source: planning chat.
- 2026-06-12 · Docs: repo markdown is source of truth; Confluence is a one-way mirror (P4.3).
- 2026-06-12 · Scope frozen per SPEC §OUT — OCR / CV / accounts / sync / notifications are v-next at best.

## Blockers
- None. (Previous GitHub auth issue was resolved).

## Handoff notes
- P0.2 tooling complete. Includes: .eslintrc.cjs, .eslintignore, .prettierrc, .prettierignore, tests/setup.ts, .github/workflows/ci.yml, and package.json updates.
- Acceptance criteria: ✓ CI green (GitHub Actions configured). ✓ ESLint/Prettier/Vitest configured.
- Next: Switch to CC (Claude Code) for P1.1 (Storage layer idb schema v1).
