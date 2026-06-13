import { describe, it, expect, beforeEach } from 'vitest';
import { clearDb } from '../src/lib/db';
import {
  putGarment,
  putBatch,
  getAllGarments,
  getAllBatches,
  deleteGarment,
  deleteBatch,
} from '../src/lib/storage';
import { exportBackup, importBackup } from '../src/lib/backup';
import type { Garment, Batch } from '../src/lib/types';

function makeBlob(content = 'photodata', type = 'image/jpeg'): Blob {
  return new Blob([content], { type });
}

function makeGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'g-001',
    code: 'SHT-01',
    type: 'SHT',
    photoBlob: makeBlob(),
    status: 'active',
    createdAt: 1000000,
    ...overrides,
  };
}

function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'b-001',
    shopName: 'Clean & Fold',
    date: 2000000,
    amountINR: 300,
    receiptBlob: null,
    status: 'closed',
    items: [{ garmentId: 'g-001', state: 'received' }],
    ...overrides,
  };
}

function blobToFile(blob: Blob, name = 'backup.zip'): File {
  return new File([blob], name, { type: blob.type });
}

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(async () => {
  await clearDb();
});

describe('exportBackup', () => {
  it('returns a Blob of type application/zip', async () => {
    await putGarment(makeGarment());
    const blob = await exportBackup();
    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces a valid ZIP starting with PK magic bytes', async () => {
    await putGarment(makeGarment());
    const blob = await exportBackup();
    const buffer = await new Promise<ArrayBuffer>((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result as ArrayBuffer);
      r.onerror = () => rej(r.error);
      r.readAsArrayBuffer(blob);
    });
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
  });

  it('exports an empty archive when DB is empty', async () => {
    const blob = await exportBackup();
    expect(blob.size).toBeGreaterThan(0); // still has ZIP structure + empty manifest
  });

  it('includes a batch with receipt', async () => {
    const garment = makeGarment();
    await putGarment(garment);
    const batch = makeBatch({ receiptBlob: makeBlob('receipt-data') });
    await putBatch(batch);
    const blob = await exportBackup();
    expect(blob.size).toBeGreaterThan(100);
  });
});

describe('importBackup round-trip', () => {
  it('restores garments after export', async () => {
    const garment = makeGarment({ id: 'g-rt-01', code: 'HOO-01', type: 'HOO' });
    await putGarment(garment);

    const backupBlob = await exportBackup();

    // Clear DB, then import
    await clearDb();
    const result = await importBackup(blobToFile(backupBlob));

    expect(result.garments).toBe(1);
    expect(result.batches).toBe(0);

    const restored = await getAllGarments();
    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe('g-rt-01');
    expect(restored[0].code).toBe('HOO-01');
    expect(restored[0].type).toBe('HOO');
    expect(restored[0].status).toBe('active');
    expect(restored[0].createdAt).toBe(1000000);
  });

  it('restores garment photo bytes faithfully', async () => {
    const content = 'fake-photo-bytes-xyz';
    await putGarment(makeGarment({ photoBlob: makeBlob(content) }));
    const backupBlob = await exportBackup();

    await clearDb();
    await importBackup(blobToFile(backupBlob));

    const [garment] = await getAllGarments();
    const text = await readBlobAsText(garment.photoBlob);
    expect(text).toBe(content);
  });

  it('restores batches and receipts faithfully', async () => {
    await putGarment(makeGarment());
    const receiptContent = 'receipt-image-bytes';
    await putBatch(
      makeBatch({
        id: 'b-rt-01',
        shopName: 'Wash World',
        receiptBlob: makeBlob(receiptContent),
      }),
    );
    const backupBlob = await exportBackup();

    await clearDb();
    const result = await importBackup(blobToFile(backupBlob));

    expect(result.garments).toBe(1);
    expect(result.batches).toBe(1);

    const [batch] = await getAllBatches();
    expect(batch.id).toBe('b-rt-01');
    expect(batch.shopName).toBe('Wash World');
    expect(batch.receiptBlob).not.toBeNull();
    const text = await readBlobAsText(batch.receiptBlob!);
    expect(text).toBe(receiptContent);
  });

  it('restores a batch with null receipt', async () => {
    await putGarment(makeGarment());
    await putBatch(makeBatch({ receiptBlob: null }));
    const backup = await exportBackup();

    await clearDb();
    await importBackup(blobToFile(backup));

    const [batch] = await getAllBatches();
    expect(batch.receiptBlob).toBeNull();
  });

  it('overwrites existing records on re-import (upsert)', async () => {
    await putGarment(makeGarment({ status: 'active' }));
    const backup = await exportBackup();

    // Change status in live DB
    await putGarment(makeGarment({ status: 'lost' }));

    // Import restores original status
    await importBackup(blobToFile(backup));
    const [garment] = await getAllGarments();
    expect(garment.status).toBe('active');
  });
});

describe('importBackup error handling', () => {
  it('rejects a non-ZIP file', async () => {
    const garbage = new File(['not a zip file at all'], 'bad.zip', {
      type: 'application/zip',
    });
    await expect(importBackup(garbage)).rejects.toThrow('Invalid backup');
  });

  it('rejects a ZIP missing backup.json', async () => {
    const { createZip } = await import('../src/lib/zip');
    const zipBytes = createZip([
      { name: 'other.txt', data: new TextEncoder().encode('hello') },
    ]);
    const file = new File([zipBytes], 'bad.zip', { type: 'application/zip' });
    await expect(importBackup(file)).rejects.toThrow('missing backup.json');
  });

  it('rejects a manifest with wrong version', async () => {
    const { createZip } = await import('../src/lib/zip');
    const manifest = JSON.stringify({
      version: 99,
      exportedAt: '',
      garments: [],
      batches: [],
    });
    const zipBytes = createZip([
      { name: 'backup.json', data: new TextEncoder().encode(manifest) },
    ]);
    const file = new File([zipBytes], 'bad.zip', { type: 'application/zip' });
    await expect(importBackup(file)).rejects.toThrow('version mismatch');
  });

  it('rejects when a referenced photo is missing from the ZIP', async () => {
    const { createZip } = await import('../src/lib/zip');
    const manifest = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      garments: [
        {
          id: 'g-001',
          code: 'SHT-01',
          type: 'SHT',
          status: 'active',
          createdAt: 1000,
          photoFile: 'photos/g-001.jpg',
        },
      ],
      batches: [],
    });
    // ZIP has backup.json but NOT photos/g-001.jpg
    const zipBytes = createZip([
      { name: 'backup.json', data: new TextEncoder().encode(manifest) },
    ]);
    const file = new File([zipBytes], 'bad.zip', { type: 'application/zip' });
    await expect(importBackup(file)).rejects.toThrow('Integrity check failed');
  });
});
