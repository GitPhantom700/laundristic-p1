# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot

- **Date:** 2026-06-13
- **Phase:** 1 — Data spine
- **Last completed:** P1.1 · Storage layer (idb schema v1, CRUD, blob store, migration scaffold)
- **Next package:** P1.2 · lane **CC** (Claude Code, Domain core)
- **Repo state:** P1.1 committed; needs push.

## Decisions

- 2026-06-13 · P1.1: Blobs stored as ArrayBuffer+mimeType in IDB (via FileReader) for jsdom/Node compatibility; public API still returns Blob. SPEC spirit preserved.
- 2026-06-13 · P1.1: clearDb() deletes the IDB database between tests (not just resets connection), fixing settings isolation.
- 2026-06-13 · App renamed from Tally to Laundristic in code and docs.
- 2026-06-13 · Standard Vite/React ESLint + Prettier + Vitest with jest-dom setup configured.
- 2026-06-13 · Design tokens in src/styles/tokens.css: Fraunces (display), Hanken Grotesk (body), paper/green palette per SPEC.
- 2026-06-13 · TypeScript strict mode enabled; paths configured for @/\* alias (not yet used, prepared for later).
- 2026-06-12 · Two-lane workflow adopted: CC = scalpel (lib/domain/camera/missing-loop), AG = volume (UI/tests/docs/deploy). Source: planning chat.
- 2026-06-12 · Docs: repo markdown is source of truth; Confluence is a one-way mirror (P4.3).
- 2026-06-12 · Scope frozen per SPEC §OUT — OCR / CV / accounts / sync / notifications are v-next at best.

## Blockers

- None. (Previous GitHub auth issue was resolved).

## Handoff notes

- P1.1 storage layer complete. Files: src/lib/types.ts, src/lib/db.ts, src/lib/storage.ts, src/lib/ids.ts, src/lib/index.ts.
- Acceptance criteria: ✓ 31 tests pass (vitest run). ✓ CRUD + blob round-trip. ✓ Settings. ✓ Code generator. ✓ migration scaffold via DB_VERSION.
- Next: P1.2 [CC] — Domain core (batch lifecycle state machine, code generator, spend aggregations). Stay on Sonnet.
