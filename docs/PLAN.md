# PLAN — Tally work packages

Lanes: **CC** = Claude Code (Sonnet; `/model haiku` for mechanical chores) · **AG** = Antigravity (Gemini only) · **CHAT** = claude.ai planning chat.
Rule: one package per session. A package is done when acceptance criteria pass AND it is committed+pushed AND PROGRESS.md names the next package.

## Ownership map (who may edit what, per phase)

| Phase | CC owns                                          | AG owns                                                    | Frozen                       |
| ----- | ------------------------------------------------ | ---------------------------------------------------------- | ---------------------------- |
| 0     | repo skeleton, configs                           | CI, lint, README, LICENSE                                  | —                            |
| 1     | `/src/lib/**` (storage, domain)                  | `/tests/**`, `/docs/**`                                    | `/src/components`            |
| 2     | `/src/lib/**`, `useCamera`, missing-loop feature | `/src/components/**`, `/src/screens/**`, `/tests`, `/docs` | each other's dirs            |
| 3     | export/import, fix pass (whole repo, AG pauses)  | PWA config, visual QA artifacts                            | —                            |
| 4     | —                                                | `/docs`, deploy, Confluence sync                           | `/src` (except agreed fixes) |

Conflict rule: if a package needs a file outside your lane, STOP, write the need in PROGRESS.md, tell the user to switch tools.

## Phase 0 — Foundation

- **P0.1 [CC]** Scaffold: Vite+React+`vite-plugin-pwa`+`idb`, folder structure (`src/lib`, `src/screens`, `src/components`, `tests`, `docs`), design tokens CSS, repo created & pushed. ✓ App boots locally; repo public.
- **P0.2 [AG]** Tooling: ESLint+Prettier, Vitest, GitHub Actions (lint+test on push), MIT LICENSE, starter README. ✓ CI green.

## Phase 1 — Data spine (scalpel work)

- **P1.1 [CC]** Storage layer: idb schema v1 (garments/batches/settings), blob photo store, CRUD API, migration scaffold, `storage.persist()` request. ✓ Unit tests for CRUD + blob round-trip.
- **P1.2 [CC]** Domain core (pure functions): batch lifecycle state machine (active→awaiting→closed; item out→received|missing→found|lost), code generator (max+1 per prefix), spend aggregations. ✓ Tests cover every transition incl. illegal ones.
- **P1.3 [AG]** Test expansion: edge/property tests against P1.1–P1.2 public APIs only. ✓ Coverage report in `/docs/coverage.md`.

## Phase 2 — Product

- **P2.1 [AG]** App shell: bottom nav (Wardrobe/Drop-offs/Stats), theme, routing, toast system. ✓ Matches POC look on 390px viewport.
- **P2.2 [CC]** `useCamera` hook: getUserMedia live viewfinder, capture→downscale→JPEG blob, iOS Safari quirks, file-input fallback. ✓ Works on real iPhone Safari.
- **P2.3 [AG]** Catalog screen: assembly-line UI on `useCamera` (shutter, category sheet, ID pill, running count). ✓ 5 items catalogued < 60s.
- **P2.4 [AG]** Wardrobe screen + edit sheet (re-tag/retake/remove, AT LAUNDRY chips). ✓ Per SPEC §Screens-1.
- **P2.5 [AG]** Drop-off flow: select grid (repeat-last, out-disabled), receipt capture, amount/shop/date, batch create. ✓ Repeat path ≤ 3 taps to receipt step.
- **P2.6 [AG]** Check-in: count-first one-tap close + per-item tick; unticked → missing on complete. ✓ Both paths produce correct item states.
- **P2.7 [CC]** Missing-item loop: Awaiting state UI, Proof screen, resolve Found/Lost, lost garment retirement. ✓ Full loop e2e per SPEC §Core-loop.
- **P2.8 [AG]** Stats screen from domain aggregations. ✓ Matches POC dashboard.
- **P2.9 [AG]** Visual refresh: user-approved update to `tokens.css` + `index.css` based on Dribbble design samples shared by user. Updates color palette, typography scale, card/sheet shadows, button radius, and fixes iOS input zoom (`font-size: 16px`). No new dependencies. ✓ App looks polished on 390px viewport; CI green.

## Phase 3 — Hardening

- **P3.1 [AG]** PWA: manifest, icons, service worker config, offline verification, iOS install guidance. ✓ Airplane-mode full loop passes.
- **P3.2 [CC]** Export/import: JSON+photos backup (zip), restore w/ integrity check. ✓ Round-trip on real device.
- **P3.3 [AG]** Visual QA: browser-subagent run of all flows, screenshot artifacts, issues filed in PROGRESS.md. ✓ Artifact set in `/docs/qa/`.
- **P3.4 [CC]** Consolidated fix pass on P3.3 findings (AG pauses; CC may touch whole repo). ✓ All filed issues closed or deferred with reason.

## Phase 4 — Ship

> The numbering below reflects what actually shipped. Earlier drafts of this plan had P4.2 targeting GitHub Pages and several P4.x slots assigned differently; the working list here is the source of truth and matches `ROADMAP.md` and `PROGRESS.md`.

- **P4.1 [AG]** Docs: architecture, data model, user guide w/ screenshots, contributing. ✓ Done — `/docs` complete.
- **P4.2 [AG]** Deploy PWA (**AWS Amplify**, not GitHub Pages as originally drafted); force light mode; camera close button restyle. ✓ Done — installable on iPhone 15 Safari at the public URL.
- **P4.3 [AG]** Confluence mirror: one-way publish `/docs` → Confluence space "Laundristic" (script or manual; repo stays source of truth). ⏳ Open — last item for the v0.1.x freeze.
- **P4.4 [CHAT]** Launch review: README/portfolio polish, LinkedIn framing. Deferred to v-next (post-freeze).
- **P4.5 [CC]** ✓ Done — Auto-delete garments on batch close. SOFT delete via `'returned'` GarmentStatus (record kept so closed-batch history/PDF still resolve garment data): `received` garments flip to 'returned' on check-in completion; `found` garments flip on batch close; `lost` already retire to 'lost'. New `setGarmentStatus` storage helper. Wardrobe filters status==='active' so returned garments drop out.
- **P4.6 [CC]** ✓ Done — Receipt PDF + native share. **Lane reassigned to CC after AG's first attempt** (`window.print()` + `@media print`) produced a broken layout. Replaced by `generateReceiptPdf` (pdf-lib, lazy-loaded) → `navigator.share({ files: [pdf] })` with a download fallback. Device-verified on iPhone 15 (2026-06-23).
- **P4.7 [AG]** ✓ Done — Delete previous batches: button in `BatchDetailsSheet` with `window.confirm()` prompt.

## Phase 5 — Admin App (post-freeze; v-next)

> Phase 5 is **out of scope for v0.1.x**. The v0.1.x branch ships with `P4.3` (Confluence mirror) as the final task; everything below moves to a forked v-next branch.

- **P5.1 [CC]** Data layer & Routing: Set up routing and data fetching for the new Admin App.
- **P5.2 [AG]** UI Layout: Build the "Dusty Blue & Sand" UI design mockup for the Admin dashboard (per `docs/ADMIN_APP.md`).

## Standing rules

- Plan drift is expected: packages may split/merge. Update this file in the same commit; never re-litigate SPEC scope inside a build session — take scope questions to CHAT.
- v1.1 parking lot (do not start): weekly reminder, shop-name autocomplete, per-category pricing, Hindi UI.
