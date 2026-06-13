# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot

- **Date:** 2026-06-13
- **Phase:** 2 — Product
- **Last completed:** P3.1 · PWA & Offline
- **Next package:** P3.2 · lane **CC** (Export/import)
- **Repo state:** pushed to main; 108 tests passing.

## Decisions

- 2026-06-13 · Simulation test: layout overflow bug found — `.app-frame` min-height:100vh + overflow:visible causes page to scroll when content is tall, pushing screen header off-screen. Fix: height:100svh + overflow:hidden on app-frame; overflow-y:auto on screen-container. Log as P3.4 fix item.
- 2026-06-13 · Simulation test: core loop 8/8 flows pass — Wardrobe, Drop-offs, Check-in (happy+short), Resolve (Found+Lost+auto-close), Proof screen, Stats, Wardrobe edit all verified functional.
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

- P2.7 Missing-item loop (CC) complete. MissingItemSheet resolves items one by one (Found/Lost); Lost retires garment to status:'lost'; isBatchResolvable auto-closes batch when all items terminal. ProofScreen is a full-screen dark overlay (z-index 80) showing receipt + shop/date + each missing garment photo — opened from both awaiting batch card ("Proof") and from within MissingItemSheet ("View Proof"). 108 tests passing.
- Acceptance criteria: ✓ Found/Lost resolution per item. ✓ Lost garment retired (status:'lost'). ✓ Batch auto-closes when all resolved. ✓ Proof screen accessible at counter with zero navigation.
- Next: P2.8 [AG] — Stats screen from domain aggregations. Switch to Antigravity.

- P2.6 Check-in flow (AG) complete. Built the DropOffs list rendering (Active, Awaiting, Closed) and the 1-tap Check-in Sheet. Verified that missing items correctly transition the batch to 'awaiting' and full check-ins transition it to 'closed'.
- Acceptance criteria: ✓ Count-first one-tap close works perfectly. ✓ Un-ticking an item flags it as missing and keeps the batch open.
- **Note for Claude Code (Visual Refresh):** The user experienced contrast issues on mobile with pure white cards blending into the light paper background. I shifted the body background to `var(--color-paper-dark)` to fix this. If the user requests further color/theme changes during P2.7, please assist them. Be aware that `SPEC.md` nominally locks the tokens, so if you introduce new colors, you may need to explicitly amend the SPEC or `tokens.css` with the user's permission.
- **Note for Claude Code (Admin App):** The user has requested to build an Admin App in the future. They specifically want to use the "Dusty Blue & Sand" UI design mockup for it (detailed in `docs/ADMIN_APP.md`). Please make sure to update the roadmap (`docs/PLAN.md`) to include the Admin App so it's officially tracked for development after the current app is finished.
- Next: P2.7 [CC] — Missing-item loop: Awaiting state UI, Proof screen, resolve Found/Lost. Switch to Claude Code.
- P2.8 Stats screen (AG) complete. Built the dashboard layout with top-line metrics (30-day spend, avg/drop, avg/garment, all-time spend) and a custom CSS flexbox 6-month bar chart using CC's domain aggregations.
- Acceptance criteria: ✓ Matches POC dashboard layout. ✓ 100% test pass rate maintained.
- P2.9 Visual refresh (AG) complete. Overrode the POC tokens with a vibrant Emerald/Slate palette. Softened card borders into diffused drop-shadows. Increased primary button sizing and locked form inputs to 16px to fix iOS Safari zooming. Added native `< Back` navigation headers to all sheets.
- Acceptance criteria: ✓ Matches modern Dribbble aesthetic. ✓ Inputs no longer zoom on iOS. ✓ 108 tests passing.
- P3.1 PWA (AG) complete. Configured VitePWA to generate Service Worker with CacheFirst strategy for Google Fonts. Added generated app icons and iOS meta tags. Implemented `InstallPrompt` to guide iOS users to "Add to Home Screen".
- Acceptance criteria: ✓ App boots entirely offline in standalone mode. ✓ Service worker registered and caches files + fonts.
- Next: P3.2 [CC] — Export/import: JSON+photos backup (zip), restore w/ integrity check. Switch to Claude Code.
