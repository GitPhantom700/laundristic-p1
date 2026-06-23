# Laundristic

_Laundry, accounted for._

Laundristic is a local-first Progressive Web App (PWA) designed for people who hand their laundry to a shop weekly and want a reliable way to keep track of it. It focuses on speed and simplicity—no accounts, no cloud sync, and no typing required. Just photos and taps.

## Features

- **Photo-First Catalog:** Snap a photo of a garment, tap a category, and it's saved. No typing descriptions.
- **Lightning-Fast Drop-offs:** Select the items you're dropping off, snap a photo of the receipt, and enter the cost.
- **Count-First Reconciliation:** When you get laundry back, checking in is a single tap. If you're short, you can easily tick off missing items and deal with them later.
- **The Missing Item Loop:** When items are missing, Laundristic acts as your proof. The Proof screen gives you the garment photo, the receipt, the shop name, and the date—all on one screen, ready to show at the counter.
- **Share Receipt as PDF:** Generate a clean, full-resolution PDF of any closed batch (shop, date, total, receipt photo, garment list) and share it via the native iOS share sheet — straight to Mail, WhatsApp, or anywhere else.
- **100% Offline & Private:** Your data and photos never leave your device. The app boots in under a second and works without an internet connection.
- **Data Portability:** Full ZIP export/import means you can easily back up your data or move it to a new device.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Learn how the local-first PWA is structured.
- [Data Model](docs/DATA_MODEL.md) - Understand the IndexedDB schema and state machines.
- [User Guide](docs/USER_GUIDE.md) - A step-by-step guide to using Laundristic, complete with screenshots.
- [Contributing](docs/CONTRIBUTING.md) - Guidelines for setting up, testing, and developing the app.

## Tech Stack

- **Frontend:** React 18 (Vite)
- **Styling:** Plain CSS with Custom Properties
- **Storage:** IndexedDB (via `idb`)
- **PWA:** `vite-plugin-pwa`
- **Receipt PDF:** `pdf-lib` (lazy-loaded, code-split)
- **Testing:** Vitest & React Testing Library

## Getting Started

```bash
# Install dependencies
npm ci

# Start the dev server
npm run dev

# Run unit tests
npm run test

# Run linter
npm run lint

# Check formatting (strict requirement before committing!)
npm run format:check
```

## License

MIT
