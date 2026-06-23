# Release Notes

## v0.1.3

### What's New

- **Share Receipt as PDF (P4.6):** Open any closed batch's receipt and tap **Share PDF** to generate a clean, full-resolution PDF (shop, date, total, receipt photo, garment list). Opens the native iOS share sheet — email it, send it via WhatsApp, or save it to Files. Useful for reimbursement claims.
- **Better photo quality in shared PDFs:** Garment and receipt JPEGs are embedded verbatim (no re-encoding), so resolution is preserved end-to-end.
- **Smaller initial bundle:** The PDF library (`pdf-lib`) is lazy-loaded — it's only fetched the first time you tap Share PDF, keeping the app fast to open.

## v0.1.0

The first stable release of Laundristic! 🎉

_Laundry, accounted for._

### Features

- **Photo-First Catalog:** Snap a photo of a garment, tap a category, and it's saved. No typing descriptions.
- **Lightning-Fast Drop-offs:** Select the items you're dropping off, snap a photo of the receipt, and enter the cost.
- **Count-First Reconciliation:** When you get laundry back, checking in is a single tap. If you're short, you can easily tick off missing items and deal with them later.
- **The Missing Item Loop:** When items are missing, Laundristic acts as your proof. The Proof screen gives you the garment photo, the receipt, the shop name, and the date—all on one screen, ready to show at the counter.
- **100% Offline & Private:** Your data and photos never leave your device. The app boots in under a second and works without an internet connection.
- **Data Portability:** Full ZIP export/import means you can easily back up your data or move it to a new device.

This release encompasses all core functionalities outlined in the original specification (Phase 1 through Phase 3). Ready for daily use!
