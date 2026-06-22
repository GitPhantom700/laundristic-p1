import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateReceiptPdf } from '../src/lib/receipt-pdf';
import type { Batch, Garment } from '../src/lib/types';

// Minimal valid 1x1 JPEG — verified embeddable by pdf-lib's embedJpg.
const JPEG_1X1 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
  'AAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==';

function jpegBlob(): Blob {
  const bytes = Uint8Array.from(atob(JPEG_1X1), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/jpeg' });
}

function makeGarment(over: Partial<Garment> = {}): Garment {
  return {
    id: 'g1',
    code: 'SHT-01',
    type: 'SHT',
    photoBlob: jpegBlob(),
    status: 'returned',
    createdAt: Date.now(),
    ...over,
  };
}

function makeBatch(over: Partial<Batch> = {}): Batch {
  return {
    id: 'b1',
    shopName: 'Clean Co',
    date: Date.UTC(2026, 5, 22),
    amountINR: 250,
    receiptBlob: jpegBlob(),
    status: 'closed',
    items: [{ garmentId: 'g1', state: 'received' }],
    ...over,
  };
}

// jsdom's Blob has no arrayBuffer(); read via FileReader like the rest of the app.
function pdfBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('generateReceiptPdf', () => {
  it('returns an application/pdf Blob with the %PDF magic header', async () => {
    const blob = await generateReceiptPdf(makeBatch(), [makeGarment()]);
    expect(blob.type).toBe('application/pdf');
    const bytes = await pdfBytes(blob);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(500);
  });

  it('embeds the receipt photo — output grows when a receipt is present', async () => {
    const withReceipt = await generateReceiptPdf(makeBatch(), []);
    const without = await generateReceiptPdf(
      makeBatch({ receiptBlob: null }),
      [],
    );
    expect((await pdfBytes(withReceipt)).length).toBeGreaterThan(
      (await pdfBytes(without)).length,
    );
  });

  it('handles a batch with no receipt and no garments', async () => {
    const blob = await generateReceiptPdf(makeBatch({ receiptBlob: null }), []);
    const bytes = await pdfBytes(blob);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('does not throw on non-ASCII shop names (sanitised, not crashed)', async () => {
    const blob = await generateReceiptPdf(
      makeBatch({ shopName: 'Café Lavé ₹ धोबी' }),
      [makeGarment()],
    );
    expect(blob.type).toBe('application/pdf');
  });

  it('skips an invalid/non-image photo instead of failing the whole PDF', async () => {
    const garment = makeGarment({
      photoBlob: new Blob(['not-an-image'], { type: 'image/jpeg' }),
    });
    const blob = await generateReceiptPdf(makeBatch({ receiptBlob: null }), [
      garment,
    ]);
    const bytes = await pdfBytes(blob);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('paginates: many garments produce a multi-page document', async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeGarment({ id: `g${i}`, code: `SHT-${i}` }),
    );
    const blob = await generateReceiptPdf(
      makeBatch({ receiptBlob: null }),
      many,
    );
    const reloaded = await PDFDocument.load(await pdfBytes(blob));
    expect(reloaded.getPageCount()).toBeGreaterThan(1);
  });
});
