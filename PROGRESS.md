# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot

- **Date:** 2026-06-13
- **Phase:** 3 — Hardening
- **Last completed:** P3.4 · Consolidated fix pass (CC)
- **Next package:** P4.3 · lane **AG** (Confluence mirror)
- **Repo state:** pushed to main; 128 tests passing; Phase 3 complete.

## Decisions

- 2026-06-15 · P4.2 UI fix: Dropped dark mode completely (forced light mode) and improved camera close button visibility.
- 2026-06-14 · P4.2 Stress test fix: Added loading="lazy" to all list <img> tags to prevent iOS Safari out-of-memory crashes on long wardrobe lists.
- 2026-06-14 · P3.4 F1: .app-frame height:100svh + overflow:hidden; .app-main overflow:hidden; .screen-container overflow-y:auto + -webkit-overflow-scrolling:touch. Page-level scroll eliminated.
- 2026-06-14 · P3.4 F2: MissingItemSheet title "Resolve Missing Items" → "Resolve Items" (fits single line at 390px).
- 2026-06-13 · P3.2: ZIP encoder/decoder implemented without any new dependency (STORE mode, CRC-32 inline). Format: backup.json + photos/<id>.jpg + receipts/<id>.jpg. importBackup validates structure + integrity before writing.
- 2026-06-13 · P3.2: Settings tab added (gear icon); exportBackup triggers download; importBackup accepts .zip via file input; both surface feedback via useToast.
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

- **AG: run `npx prettier --write .` before every commit** — CI `format:check` step has failed on every AG push (runs #33/#34/#35). CC fixed it in `539d319`. AG must adopt this habit or CI will keep failing.

## Handoff notes

- **[AG] INSTRUCTIONS FROM USER — read before starting P4.3:**
  1. **Drop dark mode entirely. Force light mode.** The dark mode UI is broken on mobile (white-on-white buttons, invisible labels). Add `color-scheme: light` to `:root` in `tokens.css` and remove the `@media (prefers-color-scheme: dark)` block from `tokens.css`. The app should always render in light mode regardless of device system setting. This also eliminates Chrome Force Dark conflicts on Android.
  2. **Fix the camera close button.** The `.catalog-close` button (top-left of the Catalog screen) is invisible — it renders as a dark blob because `background: rgba(0,0,0,0.4)` blends into the camera feed. Replace it with a clearly visible button: white background with a dark X icon, or a white X on a solid coloured circle. Minimum 44×44px tap target. Users currently cannot tell it is tappable.

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
- P3.2 Export/import (CC) complete. zip.ts: pure STORE-mode ZIP encoder/decoder (no new dependency). backup.ts: exportBackup() and importBackup(File) with integrity check. Settings screen with Export/Import buttons added (4th nav tab). 20 new tests; 128 total passing.
- Acceptance criteria: ✓ ZIP archive (valid PK magic, extractable by any unzip tool). ✓ Round-trip: photo bytes, receipt bytes, all metadata faithfully restored. ✓ Integrity check rejects partial/corrupt archives before writing. ✓ UI accessible from Settings tab.
- P3.3 Visual QA (AG) complete. Ran Puppeteer to generate screenshots for Wardrobe, Drop-offs, Stats, and Settings flows into `/docs/qa/`. Found one layout overflow bug during simulation test.
- Acceptance criteria: ✓ Artifact set in `/docs/qa/`. ✓ Issues logged for P3.4.
- P3.4 Consolidated fix pass (CC) complete. F1: layout overflow fixed (app-frame pinned to 100svh, screen-container scrolls). F2: MissingItemSheet title shortened to "Resolve Items". 128 tests passing; lint + format clean.
- Acceptance criteria: ✓ Page-level scroll eliminated on tall screens. ✓ Title fits one line at 390px. ✓ CI green.
- P4.1 Docs (AG) complete. Created `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/USER_GUIDE.md` (with screenshots), and `docs/CONTRIBUTING.md`.
- Acceptance criteria: ✓ `/docs` complete.
- P4.2 Deploy (AG) complete. Configured `.github/workflows/deploy.yml` for GitHub Pages. Updated `vite.config.ts` base path to `/laundristic/`. Added `RELEASE_NOTES.md` and tagged `v0.1.0`.
- Acceptance criteria: ✓ Installable from public URL.
- Next: P4.3 [AG] — Confluence mirror: one-way publish `/docs` → Confluence space "Tally".
