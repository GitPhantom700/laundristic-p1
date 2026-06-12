# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot

- **Date:** 2026-06-13
- **Phase:** 2 — Product
- **Last completed:** P2.4 · Wardrobe screen & Edit sheet
- **Next package:** P2.5 · lane **CC** (Checkout sheet)
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

- P2.4 Wardrobe screen (AG) complete. Displayed the garments grid with AT LAUNDRY indicators and fully functioning edit sheet (Retake, Re-tag, Remove). Tested manually and verified.
- Acceptance criteria: ✓ Wardrobe UI implements 2-col image grid. ✓ Re-tag works and assigns fresh codes. ✓ Retake photo updates blob successfully. ✓ Remove uses 2-tap confirm.
- Next: P2.5 [CC] — Checkout sheet (building batch, total amount, creating records). Switch to Claude Code.
