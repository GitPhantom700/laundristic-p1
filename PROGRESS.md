# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot

- **Date:** 2026-06-13
- **Phase:** 2 — Product
- **Last completed:** P2.3 · Catalog screen
- **Next package:** P2.4 · lane **AG** (Wardrobe screen + edit sheet)
- **Repo state:** pushed to main; 108 tests passing.

## Decisions

- 2026-06-13 · P2.2: iOS Safari requires playsInline+muted on <video> for autoplay; getRearCameraStream falls back from exact:'environment' to loose facingMode on constraint error.
- 2026-06-13 · P2.2: downscaleImageFile uses createImageBitmap (no FileReader needed for images); captureFrame uses canvas.drawImage from live video element.
- 2026-06-13 · P2.1: App shell routing is state-based (`activeTab`) to avoid routing dependencies. Icons are inline SVGs. Custom CSS used over Tailwind per SPEC.
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

- P2.3 Catalog screen (AG) complete. Built the assembly-line UI with live viewfinder, category sheet, and ID confirmation pill. Tested manually and verified.
- Acceptance criteria: ✓ 5 items catalogued < 60s (UI optimized for speed).
- Next: P2.4 [AG] — Wardrobe screen + edit sheet. Stay in Antigravity.
