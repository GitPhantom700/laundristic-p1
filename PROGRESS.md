# PROGRESS — Laundristic

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot

- **Date:** 2026-06-23
- **Phase:** 5 — Admin App
- **Last completed:** P4.3 (AG) — Confluence one-way sync script implemented (`sync:docs`).
- **Next package:** P5.1 (CC) — Data layer & Routing for the new Admin App.
- **Repo state:** pushed to main; tests passing; lint + format clean.

## Next Session Notes

- Phase 4 is officially complete! The Confluence sync script (`npm run sync:docs`) is ready. It runs a one-way mirror from `/docs` to Confluence via API v1.
- Standing by for Claude Code to execute P5.1 (Admin App routing and data layer) or for user directives to test the sync script locally.

## Decisions

- 2026-06-23 · Design docs added (CC): Authored `docs/SOLUTION_DESIGN.md`, `docs/TECHNICAL_DESIGN.md`, and `docs/DEPLOYMENT.md` to professionalise the Confluence-mirrored set. Mermaid diagrams used throughout (system context, ER, three state machines, five sequence flows, CI/Amplify pipelines). README link section reorganised into Design / Reference groups. `scripts/sync-confluence.mjs` whitelist extended with the three new files. **Security note:** the user pasted a live Confluence API token in chat — CC refused to use it and instructed immediate rotation. The sync run is the user's / AG's job, with a fresh token in `.env` only.
- 2026-06-23 · P4.3 Confluence Mirror (AG): Implemented `scripts/sync-confluence.mjs`. Parses Markdown to HTML via `marked`, rewrites relative image paths to GitHub raw URLs, and transforms GFM admonitions into Confluence `<ac:structured-macro>` info/warning blocks to preserve styling. Uses Confluence REST API v1 (`/wiki/rest/api/content`) as an initial baseline; marked as tech debt to upgrade to API v2. Only explicitly listed files are synced. The script requires `.env` credentials and currently operates as a one-way mirror with no delete capability for orphaned pages.
- 2026-06-23 · v0.1.x freeze gate (CC): Reviewed code + every `.md` for the freeze. Cleaned the small drift the freeze would have locked in — Settings footer `v1.0.2`→`v0.1.3`, `DATA_MODEL.md` now documents the `'returned'` GarmentStatus (P4.5 soft-delete), dead `no-print` classNames removed from `ProofScreen.tsx` + `BatchDetailsSheet.tsx` (the `@media print` block was deleted with P4.6), placeholder `tests/example.test.ts` removed, unused `baseUrl`/`paths` dropped from `tsconfig.json` (the `@/*` alias was never used). `PLAN.md` reconciled with `ROADMAP.md`/`PROGRESS.md` (P4.2 = Amplify not GH Pages; numbering aligned). After P4.3 (Confluence mirror, AG) lands, v0.1.x is the locked reference base; future work moves to forks.
- 2026-06-22 · P4.6 PDF export (CC): Added `pdf-lib` dependency (user-approved; SPEC §Tech amended). New pure lib `generateReceiptPdf(batch, garments)` returns an `application/pdf` Blob — A4 layout, full-res JPEGs embedded verbatim via `embedJpg` (no canvas), WinAnsi text sanitised so non-Latin shop names can't crash drawText. ProofScreen shares it via `navigator.share({files})` with download fallback. Removed `window.print()` + the whole `@media print` CSS block (the buggy mechanism). pdf-lib lazy-loaded via dynamic `import()` → split into its own chunk (main bundle 632→201 kB). 6 new tests (136 total). (Inert `no-print` classNames removed in the 2026-06-23 freeze-gate cleanup.) Fixed critical bug where the camera hardware stream remained active in the background after taking a photo or unmounting the camera component. `start()` now properly re-binds streams, and `stop()` is called immediately on capture.
- 2026-06-21 · UI Fixes (AG): Implemented "Quick View" popup on `ProofScreen` to allow users to click and enlarge garment items. Fixed white spot issue on the camera preview 'X' close button.
- 2026-06-21 · UI Fixes (AG): Fixed ProofScreen to use light theme variables matching the rest of the app, added a Delete Receipt button styled to match the theme, and fixed a Safari layout bug where flex item images stretched horizontally over text by enforcing explicit flex dimensions.
- 2026-06-21 · Layout Fix (AG): Moved all overlay sheets (`DropOffSheet`, `EditGarmentSheet`, etc.) outside of `.screen-container` in `DropOffs.tsx` and `Wardrobe.tsx` to fix a `z-index` stacking context bug on iOS/mobile browsers. Changed `.edit-sheet-overlay` to `position: fixed` to ensure full-screen coverage. Confirmed working on device.
- 2026-06-17 · Receipt camera UI fix (AG): Replaced `aspectRatio:'3/4'` + `maxHeight:'60vh'` with `height:'50vh'` on the catalog-viewfinder in `DropOffSheet.tsx`. Verified on device.
- 2026-06-17 · UI Fixes (AG): Added 'Save' button to `Catalog.tsx` confirm screen alongside 'Save & Next'. Reverted to robust inline SVG implementation for camera close button to bypass browser rendering bugs and unbreak CI pipeline. Bumped app version to 0.1.1 to invalidate PWA Service Worker cache.
- 2026-06-16 · UI Fixes (AG): Resolved white spot on camera close button by making it a dark translucent circle (`rgba(0,0,0,0.5)`) with a white stroke. Moved "Delete Batch" button in `BatchDetailsSheet` to the top-right header for immediate visibility without scrolling. Refactored `DropOffSheet` camera viewfinder from fixed `300px` height to `flex: 1` to prevent UI layout jumps on smaller screens. Reverted broken `.proof-screen` base styling that corrupted the app layout.
- 2026-06-16 · P4.6 & P4.7: Added "View Receipt" and "Share / Print" buttons for historical batches. Implemented `@media print` CSS for clean PDF generation via `window.print()`. Added "Delete Batch" button in BatchDetailsSheet with `window.confirm`.
- 2026-06-16 · Button contrast fix (CC): `--color-green` changed from #849b87 (muted sage, contrast ~2.84:1) to #4e6e52 (dark sage, contrast ~4.98:1 on white). Fixes white-on-white appearance of btn-primary ("Export Backup", "New Drop-off", etc.) and low-contrast btn-secondary ("Check In", "Import Backup"). All variants updated: green-light → #698f6e, green-lighter → #a3bfa6, green-pale → #eaf0ea. btn-primary box-shadow RGB also corrected from hardcoded emerald (#10b981) to matching sage.
- 2026-06-16 · P4.5 Auto-delete: garments leave the active catalog once back with the user. SOFT delete via new `'returned'` GarmentStatus (NOT a hard IDB delete) so closed-batch history + the future email-PDF (P4.6) can still resolve garment code/category/photo. `received` garments flip to 'returned' at check-in completion (CheckInSheet); `found` garments flip at batch close (MissingItemSheet); `lost` already retire to 'lost'. New `setGarmentStatus(id,status)` storage helper updates status without a blob round-trip. Wardrobe already filters status==='active', so returned garments vanish automatically. **If user wants bytes physically freed, switch to hard delete + denormalize code/type/photo onto BatchItem first.**
- 2026-06-16 · PWA cache: `registerSW` now calls `registration.update()` on every `visibilitychange→visible` (re-check for new build each time app is reopened/refocused); `cleanupOutdatedCaches: true` added to workbox. autoUpdate reloads when a newer SW activates. Offline still works (update() no-ops offline; cached build serves). Did NOT blanket-clear caches on open — that would break the SPEC offline requirement.
- 2026-06-16 · Camera close button confirmed CODE-CORRECT on main (`.catalog-close` = white bg + dark X via currentColor, `--color-text:#292524`). User still seeing the dark blob = stale PWA/SW cache or an old local dev-server checkout, not a code bug. The visibilitychange auto-update above is the durable fix.
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

- **[CC] PDF FIX — ✅ DONE & DEVICE-VERIFIED (2026-06-23):** Root cause was the `@media print` `visibility:hidden` hack — hidden elements still reserve layout space, so the whole app printed as blank pages around the receipt. Replaced entirely: new pure lib `generateReceiptPdf(batch, garments)` (`src/lib/receipt-pdf.ts`, pdf-lib) builds a self-contained A4 receipt with full-res JPEGs embedded verbatim (no rasterisation). ProofScreen "Share PDF" → `navigator.share({files})` (Mail/WhatsApp) with a download fallback for desktop. `window.print()` + the entire `@media print` CSS block removed. pdf-lib is lazy-loaded (`import()`) so it's code-split out of the main bundle.

- **[AG] STATUS OF USER REQUESTS:**
  1. ✓ DONE (AG, P4.2) — camera close button restyled + dark mode dropped. NOTE: code is correct on main; if user still sees the dark blob it is a stale PWA cache, addressed by the visibilitychange auto-update (CC, 2026-06-16). Not an AG action item.
  2. ✓ DONE (AG, P4.2) — light mode forced.
  3. ✓ DONE (CC, P4.5, 2026-06-16) — auto-delete garments from catalog. Implemented as SOFT delete (`'returned'` status). No AG action needed unless user wants hard delete (see Decisions).
  4. ✓ DONE (CC, 2026-06-16) — button contrast fix. `--color-green` darkened to #4e6e52 (WCAG AA compliant). All primary/secondary buttons are now readable in Chrome and Safari.
  5. ✓ DONE (CC, P4.6, 2026-06-22) — Email/share receipt PDF. **Reworked:** the original AG `window.print()` + `@media print` approach produced a broken PDF (blank pages, low res) and was replaced by `generateReceiptPdf` (pdf-lib) + `navigator.share`. See Decisions 2026-06-22.
  6. ✓ DONE (AG, P4.7) — Delete previous batches. Delete button added to BatchDetailsSheet with window.confirm() prompt.

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
