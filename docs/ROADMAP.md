# Roadmap — Laundristic

> Local-first PWA for laundry tracking. Single user, on-device, free, open source (MIT).
> Last updated: **2026-06-22** after feat(receipt): P4.6 PDF receipt export + native share (pdf-lib).

---

## Current Status

**Phase 4 · Ship** — in progress. P4.6 (receipt PDF + share) just completed.
Remaining: **P4.3 [AG]** Confluence mirror, **P4.4 [CHAT]** launch review, then Phase 5 (Admin App).

```
Phase 0 Foundation   ████████████████████  100%  COMPLETE
Phase 1 Data Spine   ████████████████████  100%  COMPLETE
Phase 2 Product      ████████████████████  100%  COMPLETE
Phase 3 Hardening    ████████████████████  100%  COMPLETE
Phase 4 Ship         █████████████░░░░░░░   65%  IN PROGRESS
```

---

## Legend

| Symbol | Meaning                                           |
| ------ | ------------------------------------------------- |
| ✅     | Done — committed, pushed, acceptance criteria met |
| 🔄     | In progress — current session                     |
| ⏳     | Upcoming — next in queue                          |
| 🔲     | Not started                                       |
| 🐛     | Known bug / fix item                              |
| [CC]   | Claude Code lane (scalpel — lib/domain/logic)     |
| [AG]   | Antigravity lane (volume — UI/CSS/tests/docs)     |

---

## Phase 0 — Foundation ✅

| Package       | Lane | Status  | Notes                                                                         |
| ------------- | ---- | ------- | ----------------------------------------------------------------------------- |
| P0.1 Scaffold | CC   | ✅ Done | Vite+React+idb+vite-plugin-pwa, folder structure, design tokens, repo created |
| P0.2 Tooling  | AG   | ✅ Done | ESLint+Prettier, Vitest, GitHub Actions CI, MIT LICENSE, README               |

---

## Phase 1 — Data Spine ✅

| Package             | Lane | Status  | Notes                                                                                 |
| ------------------- | ---- | ------- | ------------------------------------------------------------------------------------- |
| P1.1 Storage layer  | CC   | ✅ Done | IDB schema v1, blob photo store (ArrayBuffer+mimeType), CRUD API, storage.persist()   |
| P1.2 Domain core    | CC   | ✅ Done | Batch state machine, item transitions, code generator (prefix-NN), spend aggregations |
| P1.3 Test expansion | AG   | ✅ Done | Edge/property tests against P1.1–P1.2 APIs, coverage report                           |

**Key decisions:**

- Blobs stored as `{ buffer: ArrayBuffer, type: string }` in IDB for jsdom compatibility; public API returns Blob
- `closeCheckIn(batch, Set<garmentId>)` — unmarked out-items auto-flip to `missing`

---

## Phase 2 — Product ✅

| Package                | Lane | Status  | Notes                                                                                       |
| ---------------------- | ---- | ------- | ------------------------------------------------------------------------------------------- |
| P2.1 App shell         | AG   | ✅ Done | Bottom nav (Wardrobe/Drop-offs/Stats), state-based routing, toast system                    |
| P2.2 useCamera         | CC   | ✅ Done | getUserMedia live viewfinder, iOS Safari quirks, file-input fallback, downscaleImageFile    |
| P2.3 Catalog screen    | AG   | ✅ Done | Assembly-line camera UI, shutter → category sheet → ID pill → loop                          |
| P2.4 Wardrobe screen   | AG   | ✅ Done | Garment grid, edit sheet (re-tag/retake/2-tap remove), AT LAUNDRY chips                     |
| P2.5 Drop-off flow     | AG   | ✅ Done | Select grid, repeat-last preselect, receipt capture, amount/shop/date, batch create         |
| P2.6 Check-in          | AG   | ✅ Done | Count-first one-tap close + per-item tick; unticked → missing on complete                   |
| P2.7 Missing-item loop | CC   | ✅ Done | MissingItemSheet (Found/Lost per item), Lost retires garment, auto-close batch, ProofScreen |
| P2.8 Stats screen      | AG   | ✅ Done | 30-day spend, avg/drop, cost/garment, all-time, 6-month CSS bar chart                       |
| P2.9 Visual refresh    | AG   | ✅ Done | Emerald/slate palette, soft shadows, larger buttons, iOS input zoom fix (16px), ← back nav  |

**Key decisions:**

- z-index stack: `.catalog-overlay` z-50 → `.edit-sheet-overlay` z-60 → `.proof-screen` z-80
- ProofScreen rendered as Fragment sibling to escape stacking context
- `ToastType = 'info' | 'success' | 'error'` only — `'warning'` is NOT valid

---

## Phase 3 — Hardening 🔄

| Package            | Lane | Status  | Notes                                                                          |
| ------------------ | ---- | ------- | ------------------------------------------------------------------------------ |
| P3.1 PWA & Offline | AG   | ✅ Done | VitePWA + CacheFirst for Google Fonts, app icons, iOS meta tags, InstallPrompt |
| P3.2 Export/import | CC   | ✅ Done | ZIP backup (zip.ts STORE-mode encoder, no dep); Settings screen; 128 tests     |
| P3.3 Visual QA     | AG   | ✅ Done | Puppeteer screenshot run; artifacts in /docs/qa/; F1+F2 filed for P3.4         |
| P3.4 Fix pass      | CC   | ✅ Done | F1 layout overflow (100svh+scroll); F2 title wrap ("Resolve Items"); CI green  |

**P3.4 pre-filed fix items** (found in simulation test, 2026-06-13):

| #     | Bug                                                                                                                     | Severity | Fix                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 🐛 F1 | Layout overflow — `.app-frame` `min-height:100vh` + `overflow:visible` causes header to scroll off when content is tall | Medium   | `height:100svh; overflow:hidden` on `.app-frame`; `overflow-y:auto; -webkit-overflow-scrolling:touch` on `.screen-container` |
| 🐛 F2 | "Resolve Missing Items" title wraps to 2 lines at 390px                                                                 | Minor    | Shorten to "Resolve Items" or increase `gap` in header                                                                       |

---

## iOS Memory — Live Device Findings (2026-06-14)

App hosted on AWS Amplify; tested on iPhone 15 (iOS Safari). Observed OOM tab-kills on Wardrobe when many garments present.

**Applied (CC):**

- `perf(camera)`: `DEFAULT_MAX_DIMENSION` 1200 → 800, `DEFAULT_JPEG_QUALITY` 0.82 → 0.75 — cuts new-photo heap footprint ~60%

**Applied (AG):**

- `loading="lazy"` on all `<img>` tags — defers GPU pixel-decode for off-screen images

**If still crashing after live test — escalation path:**

- **M1 (CC):** IDB migration — on first load, iterate existing garments, recompress photos to 800px, overwrite in IDB. One-time, runs in background, updates `schemaVersion`.
- **M2 (CC):** Paginate `getAllGarments()` — load 20 at a time in the Wardrobe grid, infinite scroll for more.

---

## Phase 4 — Ship 🔄

| Package                   | Lane | Status  | Notes                                                                                                                                                                                                               |
| ------------------------- | ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P4.1 Docs                 | AG   | 🔲      | Architecture, data model, user guide with screenshots, contributing                                                                                                                                                 |
| P4.2 Deploy (AWS Amplify) | AG   | ✅ Done | Hosted on AWS Amplify; live on iPhone 15 Safari; light mode forced; camera close button fix                                                                                                                         |
| P4.3 Confluence mirror    | AG   | 🔲      | One-way publish `/docs` → Confluence space "Tally"                                                                                                                                                                  |
| P4.4 Launch review        | CHAT | 🔲      | README/portfolio polish, LinkedIn framing                                                                                                                                                                           |
| P4.5 Auto-delete garments | CC   | ✅ Done | Soft-delete via `'returned'` status; `setGarmentStatus()` helper; Wardrobe auto-hides returned items                                                                                                                |
| P4.6 Email PDF            | CC   | ✅ Done | `generateReceiptPdf` (pdf-lib, lazy-loaded) builds an A4 receipt; ProofScreen "Share PDF" → `navigator.share` file (Mail/WhatsApp) w/ download fallback. Replaced the broken `window.print()` + `@media print` hack |

---

## Visual Design — Pending Refresh

AG has been given Dribbble-style samples (teal-header laundry apps, June 2026 session) for a second visual pass. Target improvements:

- **Screen headers:** apply `var(--color-green)` as header background with white text
- **`btn-secondary`:** use emerald border + text color (not gray) so outline buttons are clearly tappable
- **Batch card accent:** optional left border strip in status color (blue=active, amber=awaiting)
- **General:** stronger card hierarchy, section heading weight

> Already fixed (2026-06-13): card `border: 1px solid var(--color-border)`, `app-frame` bg → `#f1f5f9`, `btn-secondary` border visible. Full visual pass to follow in a dedicated AG session.

---

## Test Coverage

- **128 tests** passing (Vitest, as of P3.2)
- Unit tests in `tests/` cover all `src/lib/**` functions
- No UI / E2E tests yet — P3.3 will add screenshot artifacts

---

## v1.1 Parking Lot (do not build in v1)

- Weekly reminder notification (one opt-in)
- Shop-name autocomplete
- Per-category pricing
- Hindi UI
- Receipt OCR / auto-category CV
- Accounts / cloud sync
- Multi-user / shop-side anything

---

## Definition of Done (v0.1.0)

- [ ] Full core loop including missing-item resolution works offline on an iPhone as installed PWA
- [ ] Data survives app restart
- [ ] Export/import round-trips on real device
- [ ] Docs published (repo + Confluence mirror)
- [ ] Public GitHub repo with CI green
- [x] Simulation test: 8/8 core loop flows verified (2026-06-13)
