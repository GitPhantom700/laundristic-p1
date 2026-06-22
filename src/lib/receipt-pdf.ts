import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
} from 'pdf-lib';
import type { Batch, Garment, GarmentCategory } from './types';

/**
 * Receipt → PDF generator (P4.6).
 *
 * Builds a clean, self-contained A4 reimbursement document from a batch and its
 * garments. We embed the original JPEG bytes directly (pdf-lib `embedJpg`) — no
 * canvas rasterisation — so photo resolution is preserved at full quality.
 *
 * This is a pure lib function: it takes data in and returns a PDF Blob. The UI
 * layer decides whether to share it (navigator.share) or download it.
 */

const CATEGORY_LABELS: Record<GarmentCategory, string> = {
  SHT: 'Shirt',
  TEE: 'T-Shirt',
  TRO: 'Trousers',
  HOO: 'Hoodie',
  KUR: 'Kurta',
  BED: 'Bedsheet',
  PIL: 'Pillow Cover',
  SHO: 'Shoes',
  ITM: 'Item',
};

// A4 in PDF points (1pt = 1/72 inch).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.11, 0.11, 0.11);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.82, 0.82, 0.82);

/**
 * Standard-14 fonts are WinAnsi-encoded and throw on any code point they cannot
 * represent (e.g. ₹ or Devanagari). Reimbursement docs only need plain Latin, so
 * we hard-restrict to printable ASCII and replace the rest — this guarantees
 * drawText never throws on free-text shop names. (Non-Latin shop names degrade to
 * '?'; embedding a Unicode font is a v1.1 concern, not worth the bundle here.)
 */
function safe(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, '?');
}

function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Embed an image blob, sniffing PNG vs JPEG by magic bytes. Returns null instead
 * of throwing if the bytes are not a valid image, so one bad photo can't sink the
 * whole document.
 */
async function embedImage(
  doc: PDFDocument,
  blob: Blob,
): Promise<PDFImage | null> {
  try {
    const bytes = await blobToUint8Array(blob);
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    return isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function generateReceiptPdf(
  batch: Batch,
  garments: Garment[],
): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Receipt — ${batch.shopName || 'Laundry'}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const text = (
    s: string,
    size: number,
    f: PDFFont,
    color = INK,
    x = MARGIN,
  ) => {
    page.drawText(safe(s), { x, y, size, font: f, color });
  };

  /** Start a fresh page if `needed` points won't fit above the bottom margin. */
  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Header ────────────────────────────────────────────────────────────────
  y -= 22;
  text('Laundry Receipt', 22, bold);
  y -= 30;
  text(batch.shopName || 'Laundry', 14, bold);
  y -= 18;
  const dateStr = new Date(batch.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  text(dateStr, 11, font, MUTED);
  y -= 20;
  text(`Total: INR ${batch.amountINR}`, 13, bold);
  y -= 18;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: RULE,
  });
  y -= 26;

  // ── Receipt photo ───────────────────────────────────────────────────────────
  if (batch.receiptBlob) {
    const img = await embedImage(doc, batch.receiptBlob);
    if (img) {
      const scale = Math.min(CONTENT_WIDTH / img.width, 320 / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      ensureSpace(h + 26);
      text('Receipt', 12, bold);
      y -= h + 10;
      page.drawImage(img, { x: MARGIN, y, width: w, height: h });
      y -= 26;
    }
  }

  // ── Garment list ─────────────────────────────────────────────────────────────
  ensureSpace(26);
  text(`Garments (${garments.length})`, 12, bold);
  y -= 22;

  const THUMB = 48;
  const ROW_H = THUMB + 12;
  for (const g of garments) {
    ensureSpace(ROW_H);
    const rowTop = y;
    const img = await embedImage(doc, g.photoBlob);
    if (img) {
      const s = Math.min(THUMB / img.width, THUMB / img.height);
      page.drawImage(img, {
        x: MARGIN,
        y: rowTop - THUMB,
        width: img.width * s,
        height: img.height * s,
      });
    }
    const textX = MARGIN + THUMB + 12;
    page.drawText(safe(g.code), {
      x: textX,
      y: rowTop - 16,
      size: 12,
      font: bold,
      color: INK,
    });
    page.drawText(safe(CATEGORY_LABELS[g.type] ?? g.type), {
      x: textX,
      y: rowTop - 32,
      size: 10,
      font,
      color: MUTED,
    });
    y -= ROW_H;
  }

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
