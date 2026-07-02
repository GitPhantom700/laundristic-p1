# Technical Design

> Engineering-level companion to [Solution Design](SOLUTION_DESIGN.md). All diagrams are Mermaid and render natively on GitHub.

| Field          | Value                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Version**    | v0.1.3                                                                                     |
| **Test suite** | 135 tests (Vitest)                                                                         |
| **Build**      | Vite 5 + `vite-plugin-pwa`                                                                 |
| **Repo**       | [github.com/GitPhantom700/laundristic-p1](https://github.com/GitPhantom700/laundristic-p1) |

---

## 1. Architecture at a glance

Laundristic is a single-page React application with strict layering: **UI components** depend on **domain library**, which depends on **storage**, which depends on **IndexedDB**. The dependency arrow never reverses.

```mermaid
flowchart TD
    subgraph UI["UI layer — src/screens, src/components"]
        Screens["Screens<br/>(Wardrobe, DropOffs,<br/>Stats, Settings)"]
        Components["Sheets &amp; Overlays<br/>(DropOffSheet, CheckInSheet,<br/>MissingItemSheet, ProofScreen)"]
        Toast["ToastProvider"]
    end

    subgraph Lib["Domain library — src/lib"]
        Camera["useCamera +<br/>camera.ts"]
        Domain["domain.ts<br/>(state machines,<br/>aggregations)"]
        IDs["ids.ts<br/>(UUID + PREFIX-NN)"]
        Storage["storage.ts<br/>(CRUD wrappers)"]
        Backup["backup.ts<br/>(ZIP export/import)"]
        Zip["zip.ts<br/>(pure STORE encoder)"]
        Pdf["receipt-pdf.ts<br/>(pdf-lib, lazy)"]
        Types["types.ts"]
    end

    subgraph Persist["Persistence — browser-native"]
        DB["db.ts<br/>(idb wrapper)"]
        IDB[("IndexedDB v1<br/>garments | batches |<br/>settings stores")]
        SW["Service Worker<br/>(vite-plugin-pwa)"]
        Share["navigator.share()<br/>+ download fallback"]
    end

    Screens --> Components
    Screens --> Domain
    Screens --> Storage
    Components --> Camera
    Components --> Domain
    Components --> Storage
    Components --> Backup
    Components -.->|dynamic import| Pdf
    Components --> Share
    Pdf --> Types
    Backup --> Storage
    Backup --> Zip
    Storage --> DB
    Storage --> Types
    Domain --> Types
    DB --> IDB
    SW -.->|caches assets| Screens
```

Two lazy-loaded boundaries are deliberate:

1. `pdf-lib` (~400 KB) is only fetched when the user taps **Share PDF**. Code-split via dynamic `import()` in `ProofScreen.tsx`.
2. The service worker registers asynchronously, so a slow SW install never blocks the first paint.

---

## 2. Module breakdown

### `src/lib` (pure / unit-tested)

| Module                       | Responsibility                                            | LOC class |
| ---------------------------- | --------------------------------------------------------- | --------- |
| `types.ts`                   | `Garment`, `Batch`, `BatchItem`, `Settings`, enums        | Tiny      |
| `db.ts`                      | `idb` schema v1 + Blob ↔ ArrayBuffer round-trip           | Small     |
| `storage.ts`                 | CRUD + `setGarmentStatus`, `getBatchesByStatus`, persist  | Medium    |
| `domain.ts`                  | Batch & item state machines, code generator, aggregations | Largest   |
| `ids.ts`                     | UUID generator + `PREFIX-NN` code allocator               | Small     |
| `camera.ts` + `useCamera.ts` | `getUserMedia`, downscale, JPEG capture                   | Medium    |
| `backup.ts` + `zip.ts`       | ZIP export/import with integrity check                    | Medium    |
| `receipt-pdf.ts`             | A4 receipt PDF via `pdf-lib` (lazy-loaded)                | Small     |

### `src/components` & `src/screens` (UI / integration-tested in browser)

Screens are top-level routes (`Wardrobe`, `DropOffs`, `Stats`, `Settings`, `Catalog`). Components are bottom-sheets and overlays (`DropOffSheet`, `CheckInSheet`, `MissingItemSheet`, `ProofScreen`, `EditGarmentSheet`, `BatchDetailsSheet`, `InstallPrompt`, `ToastProvider`).

UI imports `lib`; **`lib` never imports UI**. Enforced by directory convention.

---

## 3. Data model

### Entity relationships

```mermaid
erDiagram
    GARMENT ||--o{ BATCH_ITEM : "appears in"
    BATCH ||--|{ BATCH_ITEM : "contains"
    BATCH ||--o| RECEIPT_BLOB : "has receipt"
    GARMENT ||--|| PHOTO_BLOB : "has photo"

    GARMENT {
        string id "UUID"
        string code "ITM-01"
        enum type "ITM (catch-all; legacy category values retained)"
        Blob photoBlob "JPEG"
        enum status "active|returned|lost|removed"
        number createdAt
    }

    BATCH {
        string id "UUID"
        string shopName
        number date "epoch ms"
        number amountINR
        Blob receiptBlob "JPEG | null"
        enum status "active|awaiting|closed"
    }

    BATCH_ITEM {
        string garmentId "FK"
        enum state "out|received|missing|found|lost"
    }
```

`BatchItem` is embedded inside `Batch.items[]` — not a separate IndexedDB store. This keeps batch operations transactional in one read/write.

### Schema versioning

The IDB schema is **v1**. `Settings.schemaVersion` is recorded for future migrations; no migration has run yet.

### Why Blob ↔ ArrayBuffer

`StoredBlob = { buffer: ArrayBuffer, type: string }` is the on-disk shape. Public storage API returns reconstituted `Blob`s. This decouples us from jsdom's incomplete `Blob.arrayBuffer()` support during tests — all conversion goes through `FileReader.readAsArrayBuffer()` instead.

---

## 4. State machines

The integrity of the missing-item loop depends entirely on these transitions being airtight. All are pure functions in `src/lib/domain.ts` and tested by `tests/domain.test.ts` + `tests/property.test.ts`.

### 4.1 Batch lifecycle

```mermaid
stateDiagram-v2
    [*] --> active : createBatch()
    active --> awaiting : closeCheckIn(batch, receivedSet) /<br/>some items missing
    active --> closed : closeCheckIn(batch, receivedSet) /<br/>all items received
    awaiting --> closed : isBatchResolvable()<br/>(all missing items found-or-lost)
    closed --> [*]

    note right of active
        Drop-off created.
        All items in state 'out'.
    end note

    note right of awaiting
        Check-in done, but
        at least one item missing.
    end note
```

### 4.2 BatchItem lifecycle

```mermaid
stateDiagram-v2
    [*] --> out : drop-off
    out --> received : user ticks at check-in
    out --> missing : user does NOT tick at check-in
    missing --> found : MissingItemSheet → "Found"
    missing --> lost : MissingItemSheet → "Lost"<br/>(also flips Garment.status to 'lost')
    received --> [*]
    found --> [*]
    lost --> [*]
```

### 4.3 Garment lifecycle (soft delete)

```mermaid
stateDiagram-v2
    direction LR
    [*] --> active : catalog
    active --> returned : batch closes (received/found)
    active --> lost : item lost
    active --> removed : user deletes
    returned --> active : re-used in a later drop-off
    note right of returned
        Soft-deleted: hidden
        from Wardrobe but still
        resolvable from batch
        history + receipt PDF.
    end note
```

The Wardrobe screen filters strictly on `status === 'active'`. The three non-active states are kept in IDB so closed-batch receipts and shared PDFs still render the garment's photo and code. _(P4.5 decision, see PROGRESS.)_

---

## 5. Critical flows (sequence diagrams)

### 5.1 Catalogue a new garment

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Cat as Catalog screen
    participant Cam as useCamera
    participant Lib as domain.ts / ids.ts
    participant Sto as storage.ts
    participant IDB as IndexedDB

    U->>Cat: tap camera icon
    Cat->>Cam: start()
    Cam-->>Cat: live viewfinder (getUserMedia)
    U->>Cat: tap shutter
    Cat->>Cam: capture()
    Cam-->>Cat: photoBlob (JPEG, ≤800px)
    Cat->>Cat: stop() immediately
    Cat->>Lib: generateCode('ITM', existingCodes)
    Lib-->>Cat: "ITM-04"
    Cat->>Sto: putGarment({id, code, type, photoBlob, status:'active'})
    Sto->>IDB: put + storedBlob round-trip
    IDB-->>Sto: ack
    Sto-->>Cat: ok
    Cat-->>U: toast "Saved", loops viewfinder
```

### 5.2 Drop-off

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant DO as DropOffs screen
    participant Sheet as DropOffSheet
    participant Cam as useCamera
    participant Sto as storage.ts

    U->>DO: tap "New Drop-off"
    DO->>Sheet: open
    Sheet->>Sto: getAllGarments(status:'active')
    Sto-->>Sheet: garments[]
    U->>Sheet: select items (or "repeat last")
    Sheet->>Cam: start() — receipt step
    U->>Cam: shutter
    Cam-->>Sheet: receiptBlob
    U->>Sheet: enter shop name + ₹ amount
    Sheet->>Sto: putBatch({status:'active', items:[{garmentId, state:'out'}]})
    Sto-->>Sheet: ok
    Sheet-->>U: toast, close — batch is Active
```

### 5.3 Check-in — happy path

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant CI as CheckInSheet
    participant Dom as domain.ts
    participant Sto as storage.ts

    U->>CI: open batch → "Check In All Items"
    CI->>Dom: closeCheckIn(batch, allGarmentIds)
    Dom-->>CI: batch with all items state='received', status='closed'
    CI->>Sto: putBatch(closed)
    CI->>Sto: setGarmentStatus(each, 'returned')
    Sto-->>CI: ok
    CI-->>U: toast "Batch closed"
```

### 5.4 Check-in — short path → missing-item loop

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant CI as CheckInSheet
    participant Mi as MissingItemSheet
    participant Pr as ProofScreen
    participant Dom as domain.ts
    participant Sto as storage.ts

    U->>CI: un-tick missing items → "Save"
    CI->>Dom: closeCheckIn(batch, receivedSet)
    Dom-->>CI: status='awaiting', missing items flagged
    CI->>Sto: putBatch + setGarmentStatus('returned') for received
    CI-->>U: batch moved to "Awaiting"

    U->>Mi: open Awaiting batch
    loop per missing item
        U->>Mi: tap "Found" or "Lost"
        Mi->>Dom: transitionBatchItem(batch, garmentId, resolution)
        alt resolution = 'lost'
            Mi->>Sto: putGarment({...g, status:'lost'})
        end
        Dom-->>Mi: updated batch
        Mi->>Dom: isBatchResolvable(updated)?
        alt all resolved
            Mi->>Dom: transitionBatch(updated, 'closed')
            Mi->>Sto: putBatch(closed)
            Mi->>Sto: setGarmentStatus('returned') for received/found
            Mi-->>U: "Batch closed"
        else still pending
            Mi->>Sto: putBatch(updated)
            Mi-->>U: toast "Found" / "Lost"
        end
    end

    Note over U,Pr: "View Proof" available throughout — opens ProofScreen
```

### 5.5 Receipt PDF share

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Pr as ProofScreen
    participant Pdf as receipt-pdf.ts
    participant Lib as pdf-lib
    participant Nav as navigator.share

    U->>Pr: tap "Share PDF" on closed batch
    Pr->>Pr: setSharing(true)
    Pr->>Pdf: dynamic import('./receipt-pdf')
    Pdf-->>Pr: generateReceiptPdf
    Pr->>Pdf: generateReceiptPdf(batch, garments)
    Pdf->>Lib: PDFDocument.create() + embedJpg(receipt + garment photos)
    Lib-->>Pdf: PDF bytes
    Pdf-->>Pr: Blob (application/pdf)

    alt navigator.canShare({files:[pdf]})
        Pr->>Nav: navigator.share({files:[pdf], title, text})
        Nav-->>U: iOS share sheet (Mail / WhatsApp / Save)
    else fallback (desktop)
        Pr->>Pr: createObjectURL + click anchor
        Pr-->>U: file download
    end
    Pr->>Pr: setSharing(false)
```

---

## 6. PWA & offline strategy

```mermaid
flowchart LR
    A[First visit] --> B[index.html + JS shell loads]
    B --> C[Service worker registers]
    C --> D[Precache app shell +<br/>workbox + receipt-pdf chunk]
    D --> E[App fully usable offline]
    E -->|visibilitychange: visible| F[registration.update]
    F -->|new SW activates| G[autoUpdate reload]
    F -->|offline / no new SW| H[serve cached build]
```

Key choices:

- **`registerType: 'autoUpdate'`** in `vite-plugin-pwa` — newer service workers activate as soon as the user returns to the tab.
- **`cleanupOutdatedCaches: true`** — prevents the precache from accumulating stale assets across versions.
- **`navigator.storage.persist()`** is requested once on first run — without it iOS can evict IDB under storage pressure.
- **Code-split `pdf-lib`** still ends up in the precache (Workbox treats it as a build artifact), so PDF share works offline after first install.

---

## 7. Performance characteristics

| Metric                  | Value                                | Where measured                     |
| ----------------------- | ------------------------------------ | ---------------------------------- |
| Main JS bundle          | **201 KB** (61.7 KB gzip)            | `npm run build`                    |
| `pdf-lib` chunk (lazy)  | 431 KB (178.6 KB gzip)               | code-split, fetched on first Share |
| CSS bundle              | 19.9 KB (4.2 KB gzip)                | single file                        |
| Tests                   | 135 in ~3 s                          | `npm run test -- --run`            |
| First-paint asset count | 10 precached entries (~643 KB total) | `vite-plugin-pwa` log              |

### iOS-memory tunings (live device findings)

- **Camera capture max dimension:** 800 px (originally 1200) — cuts new-photo heap footprint ~60%.
- **JPEG quality:** 0.75 (originally 0.82) — visually indistinguishable on phone screens.
- **`loading="lazy"`** on every `<img>` in lists — defers GPU pixel-decode for off-screen items.

Escalation path (deferred to v-next): IDB migration to recompress old photos; pagination of `getAllGarments()`.

---

## 8. Testing strategy

```mermaid
flowchart LR
    subgraph Unit
        D[domain.test.ts<br/>53 tests]
        I[ids.test.ts<br/>9 tests]
        Z[zip.test.ts<br/>7 tests]
        P[receipt-pdf.test.ts<br/>6 tests]
    end
    subgraph Integration
        S[storage.test.ts<br/>23 tests<br/>+ fake-indexeddb]
        B[backup.test.ts<br/>13 tests]
        C[camera.test.ts<br/>13 tests]
    end
    subgraph Property
        Pr[property.test.ts<br/>11 tests<br/>+ fast-check]
    end

    classDef pass fill:#eaf0ea,stroke:#4e6e52,color:#1f2937
    class D,I,Z,P,S,B,C,Pr pass
```

- **Unit tests** target pure functions with literal inputs.
- **Integration tests** for storage use `fake-indexeddb` — the IDB API runs in jsdom without a browser.
- **Property tests** (`fast-check`) generate random batches and assert invariants: e.g. _for any sequence of transitions, a batch never ends up in an illegal state_.
- CI runs `npm run lint` + `npm run format:check` + `npm run test -- --run` on every push.

---

## 9. Security & privacy posture

| Concern                        | Posture                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PII leakage**                | None — no network calls during the core loop, no analytics, no remote logging                                                                    |
| **Data at rest**               | IndexedDB in the browser sandbox; user's OS-level disk encryption is the boundary                                                                |
| **Auth**                       | None by design — single-user, on-device. The phone's lock screen is the gate                                                                     |
| **Receipt-PDF text injection** | All free-text fields (shop name) are sanitised to printable ASCII before drawing in PDF, preventing `drawText` crashes on non-WinAnsi characters |
| **Service worker scope**       | Limited to app origin; no cross-origin caching                                                                                                   |
| **Dependencies**               | 4 runtime deps (`react`, `react-dom`, `idb`, `pdf-lib`); audited via `npm audit` in CI                                                           |

The threat model is small because the attack surface is small. Anything we don't ship can't be exploited.

---

## 10. Build & release

- **Vite 5** produces `dist/` with hashed asset filenames.
- **`vite-plugin-pwa`** emits the manifest, icons, and service worker (`sw.js`, `workbox-*.js`).
- **GitHub Actions** runs lint + format + tests on every push (`.github/workflows/ci.yml`).
- **GitHub Pages** deploys on every push to `main` (`.github/workflows/deploy.yml`) and serves the PWA over HTTPS at [gitphantom700.github.io/laundristic-p1](https://gitphantom700.github.io/laundristic-p1/). See [Deployment](DEPLOYMENT.md).

---

## 11. Cross-references

- [Solution Design](SOLUTION_DESIGN.md) — problem framing, users, success metrics
- [Architecture](ARCHITECTURE.md) — narrative implementation notes
- [Data Model](DATA_MODEL.md) — schema reference with TypeScript snippets
- [Deployment](DEPLOYMENT.md) — GitHub Pages pipeline, GitHub repo, CI/CD
- [User Guide](USER_GUIDE.md) — end-user flow with screenshots
