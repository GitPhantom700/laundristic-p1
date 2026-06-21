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

- **P4.1 [AG]** Docs: architecture, data model, user guide w/ screenshots, contributing. ✓ `/docs` complete.
- **P4.2 [AG]** Deploy PWA (GitHub Pages), tag v0.1.0, release notes. ✓ Installable from public URL.
- **P4.3 [AG]** Confluence mirror: one-way publish `/docs` → Confluence space "Laundristic" (script or manual; repo stays source of truth). ✓ Space matches repo docs.
- **P4.4 [AG]** UI fixes: (a) camera close button solid + visible (no transparency); (b) force light mode — remove `@media (prefers-color-scheme: dark)` from tokens.css, add `color-scheme: light` to `:root`. ✓ Both verified on real device.
- **P4.5 [CC]** ✅ DONE — Auto-delete garments on batch close. SOFT delete via `'returned'` GarmentStatus (record kept so closed-batch history/PDF still resolve garment data): `received` garments flip to 'returned' on check-in completion; `found` garments flip on batch close; `lost` already retire to 'lost'. New `setGarmentStatus` storage helper. Wardrobe filters status==='active' so returned garments drop out. ✓ Catalog only shows garments in user's possession; 130 tests passing.
- **P4.6 [AG]** Email PDF share: "Share / Email" button on closed batch cards + Proof screen. Generates PDF (or print-formatted HTML fallback) containing shop name, date, amount, garment list, embedded receipt photo. Opens native share sheet (`navigator.share` / `mailto:` fallback). ✓ User can email batch summary for reimbursement.
- **P4.7 [CHAT]** Launch review: README/portfolio polish, LinkedIn framing. ✓ Done in planning chat.
- **P4.8 [CHAT]** LinkedIn outreach research: identify articles, posts, and open-source showcase communities on LinkedIn where sharing the public GitHub repo would reach real users (laundry/household apps, indie PWA builders, portfolio showcases). Curate a shortlist of relevant hashtags, groups, and post formats. ✓ Done in planning chat.

## Standing rules

- Plan drift is expected: packages may split/merge. Update this file in the same commit; never re-litigate SPEC scope inside a build session — take scope questions to CHAT.
- v1.1 parking lot (do not start): weekly reminder, shop-name autocomplete, per-category pricing, Hindi UI.
