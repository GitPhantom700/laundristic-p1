# Specification

_Never lose a garment again._ A local-first PWA for people who hand laundry to a shop weekly and keep manual records. Single-user, on-device, free, open source (MIT).

## The user

A tired working person in India (PG / coliving / no home machine). Energy budget per interaction: ~30 seconds. The competitor is not another app — it is "too tired, skip it this week."

## North-star principles

1. **Time-to-done, not time-in-app.** No streaks, badges, notifications, feeds, accounts.
2. **Photo is the label.** No typed garment names. Category + auto-ID + photo.
3. **Count-first reconciliation.** Happy path = one tap. Item-by-item only when the count is short.
4. **Reliability is retention.** Loads < 1s, fully offline, never loses a photo.
5. **Honest lock-in.** Value accumulates (catalog + history); export is always available.

## Core loop (the spine)

Catalog once → Drop-off (tap items + receipt photo + amount) → Out for service → Check back in →

- all back: one tap, closed
- short: tick received, rest auto-flag **missing** → batch enters **Awaiting items** →
  **Proof screen** (garment photo + receipt + date, one screen to show at the counter) →
  resolve each missing item **Found** (closes) or **Lost** (retires garment).

The missing-item loop is the product's reason to exist. It ships in MVP.

## Data model (IndexedDB, schema v1)

- `garments`: { id, code, type, photoBlob, status: active|lost|removed, createdAt }
- `batches`: { id, shopName, date, amountINR, receiptBlob, status: active|awaiting|closed,
  items: [{ garmentId, state: out|received|missing|found|lost }] }
- `settings`: { lastShop, schemaVersion }
- Codes: `PREFIX-NN`, next = max existing for prefix + 1. Internal ids immutable; codes display-only.

## Categories

Items are not manually categorized; every garment uses the catch-all `ITM` type (codes `ITM-NN`). The data model retains a category enum (SHT · TEE · TRO · HOO · KUR · BED · PIL · SHO · ITM) for legacy garments. "Garments, linens & shoes only" is stated policy, not CV-enforced.

## Screens

1. **Wardrobe** — grid (photo, code badge, AT LAUNDRY chip), tap to edit (retake photo, remove w/ 2-tap confirm). Assembly-line camera catalog: live viewfinder → shutter → ID confirm pill → loop, running count.
2. **Drop-offs** — active batches up top w/ one-tap check-in entry; Awaiting section; closed history. New drop-off: Same-as-last-time preselect, out-items disabled, shop prefilled, last amount as placeholder.
3. **Proof screen** — per missing item: garment photo, receipt, shop, date. Zero navigation at the counter.
4. **Stats** — last-30-days spend, avg/drop, cost/garment, 6-month bars, all-time.

## Tech (frozen)

Vite + React 18, plain CSS w/ custom properties (Fraunces + Hanken Grotesk fonts; palette updated in P2.9 per user-approved visual refresh), `idb` for IndexedDB, `vite-plugin-pwa` for offline/install, `navigator.storage.persist()`, JSON+photos export/import, `pdf-lib` for receipt PDF generation (added P4.6 with user approval; lazy-loaded so it stays out of the initial bundle). No backend, no analytics, no CSS framework, no state library. Primary target: iOS Safari PWA; Android Chrome second.

## Explicitly OUT of scope (v1 — do not build, do not discuss in sessions)

Receipt OCR · auto-category CV · CV content gate · accounts/cloud sync · multi-user · shop-side anything · notifications (one opt-in weekly reminder may come in v1.1) · monetization.

## Definition of done (v0.1.0)

Full core loop incl. missing-item resolution works offline on an iPhone as installed PWA; data survives restart; export/import round-trips; docs published; public GitHub repo with CI green.
