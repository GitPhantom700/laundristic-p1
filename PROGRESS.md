# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot

- **Date:** 2026-06-13
- **Phase:** 1 — Data spine
- **Last completed:** P1.2 · Domain core (state machines, spend aggregations)
- **Next package:** P1.3 · lane **AG** (Antigravity, test expansion)
- **Repo state:** pushed to main; CI should be green.

## Decisions

- 2026-06-13 · P1.2: closeCheckIn takes a Set<garmentId> of received items; unmarked out-items auto-flip to missing. Drives both the count-first and per-item check-in paths.
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

- P1.2 domain core complete. File: src/lib/domain.ts. 84 total tests pass (31 storage + 9 ids + 1 example + 53 domain + 1 example).
- Acceptance criteria: ✓ All batch/item transitions tested incl. illegal. ✓ closeCheckIn. ✓ isBatchResolvable. ✓ computeSpendStats. ✓ getMonthlySpendWindow.
- Next: P1.3 [AG] — Test expansion (edge/property tests against P1.1–P1.2 APIs). Switch to Antigravity.
