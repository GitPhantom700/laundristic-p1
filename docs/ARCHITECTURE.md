# Architecture

Laundristic is intentionally designed to be a lightweight, single-user, local-first Progressive Web App (PWA). The architecture reflects the primary goal of providing a fast, reliable, and completely offline experience.

## App Shell and Routing

The application avoids complex routing libraries (like React Router) in favor of simple, state-based routing. The `App` component maintains an `activeTab` state that corresponds to the four main sections of the bottom navigation:

1. **Wardrobe** (`Catalog.tsx` / `Wardrobe.tsx`)
2. **Drop-offs** (`DropOffs.tsx`)
3. **Stats** (`Stats.tsx`)
4. **Settings** (`Settings.tsx`)

Modals, full-screen camera overlays, and details sheets are rendered as conditional portals or overlays with appropriate `z-index` layering, creating a smooth, app-like feel.

## Storage Layer

The app uses **IndexedDB** as its sole data store, wrapped by the `idb` library for Promise-based access.

### Why IndexedDB?

- **Blob Storage:** We store photos (garments and receipts) directly as `Blob` (specifically, `ArrayBuffer` wrapped with MIME types to ensure cross-browser and Node.js testing compatibility). LocalStorage cannot handle binary data or the volume of photos a user might take.
- **Persistence:** The app explicitly requests persistent storage via `navigator.storage.persist()` on boot to prevent the browser from evicting data under storage pressure.

## Progressive Web App (PWA)

Laundristic uses `vite-plugin-pwa` to generate a Service Worker using Workbox.

- **Caching Strategy:** A `CacheFirst` strategy is used for Google Fonts, while the application shell and static assets are precached.
- **Offline Capabilities:** Once installed, the app can boot and function entirely without an internet connection.
- **Installability:** An `InstallPrompt` component detects iOS Safari users and guides them to add the app to their Home Screen, enabling standalone mode.

## Export & Import (Backup)

To prevent data lock-in and provide a way to migrate to new devices, the app features a ZIP-based export/import system.

- **No External Dependencies:** The ZIP encoder/decoder (`src/lib/zip.ts`) is built entirely from scratch using the standard ZIP format (STORE mode, inline CRC-32) to keep the app payload tiny.
- **Format:** The backup archive contains a `backup.json` file with all structured data, alongside `photos/<id>.jpg` and `receipts/<id>.jpg` binary files.
- **Integrity Checks:** When importing, the system strictly validates the ZIP structure and parses the JSON before dropping the existing database to prevent corruption.

## Receipt PDF Export

Closed batches can be exported as a PDF and shared via the native iOS share sheet (Mail, WhatsApp, etc.).

- **Pure lib function:** `generateReceiptPdf(batch, garments)` in `src/lib/receipt-pdf.ts` returns an `application/pdf` Blob. The UI layer (`ProofScreen`) decides whether to share or download it — keeping the lib trivially unit-testable.
- **Full-resolution photos:** The receipt JPEG and every garment thumbnail are embedded verbatim via `pdf-lib`'s `embedJpg` — no canvas rasterization, so quality is preserved end-to-end.
- **Lazy-loaded:** `pdf-lib` is pulled in via dynamic `import('./receipt-pdf')` only when the user actually taps **Share PDF**. This keeps the library out of the initial bundle (it's ~400 kB) and Vite code-splits it into its own chunk. The chunk is still precached by the service worker, so offline export works.
- **Native share with fallback:** On iOS Safari we use `navigator.share({ files: [pdf] })`. On platforms without file-share support, the app falls back to a regular download.

## Hardware Integration

The `useCamera` hook interfaces with `getUserMedia` to provide a live viewfinder.

- It captures video frames directly to an HTML `<canvas>`, then compresses them into JPEG blobs using `createImageBitmap` and `canvas.toBlob()`.
- For iOS Safari compatibility, the `<video>` element is strictly set to `playsInline` and `muted`. It gracefully falls back to a standard `<input type="file" accept="image/*">` if the hardware camera fails or permissions are denied.
