import { describe, it, expect, beforeEach } from 'vitest';
import { clearDb } from '../src/lib/db';
import {
  putGarment,
  getGarment,
  getAllGarments,
  getGarmentsByStatus,
  deleteGarment,
  setGarmentStatus,
  putBatch,
  getBatch,
  getAllBatches,
  getBatchesByStatus,
  deleteBatch,
  getSetting,
  setSetting,
  getAllSettings,
} from '../src/lib/storage';
import type { Garment, Batch } from '../src/lib/types';

function makeBlob(content = 'photo'): Blob {
  return new Blob([content], { type: 'image/jpeg' });
}

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function makeGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'g-001',
    code: 'SHT-01',
    type: 'SHT',
    photoBlob: makeBlob(),
    status: 'active',
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'b-001',
    shopName: 'Clean & Fold',
    date: Date.now(),
    amountINR: 250,
    receiptBlob: makeBlob('receipt'),
    status: 'active',
    items: [{ garmentId: 'g-001', state: 'out' }],
    ...overrides,
  };
}

beforeEach(async () => {
  await clearDb();
});

// ─── Garments ────────────────────────────────────────────────────────────────

describe('garment CRUD', () => {
  it('puts and retrieves a garment by id', async () => {
    const g = makeGarment();
    await putGarment(g);
    const retrieved = await getGarment('g-001');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('g-001');
    expect(retrieved!.code).toBe('SHT-01');
    expect(retrieved!.type).toBe('SHT');
    expect(retrieved!.status).toBe('active');
  });

  it('returns undefined for missing id', async () => {
    const result = await getGarment('nonexistent');
    expect(result).toBeUndefined();
  });

  it('puts multiple garments and getAll returns them all', async () => {
    await putGarment(makeGarment({ id: 'g-001', code: 'SHT-01' }));
    await putGarment(makeGarment({ id: 'g-002', code: 'TEE-01', type: 'TEE' }));
    const all = await getAllGarments();
    expect(all).toHaveLength(2);
  });

  it('overwrites on put with same id', async () => {
    await putGarment(makeGarment({ status: 'active' }));
    await putGarment(makeGarment({ status: 'lost' }));
    const g = await getGarment('g-001');
    expect(g!.status).toBe('lost');
  });

  it('deletes a garment', async () => {
    await putGarment(makeGarment());
    await deleteGarment('g-001');
    expect(await getGarment('g-001')).toBeUndefined();
  });

  it('getGarmentsByStatus filters correctly', async () => {
    await putGarment(makeGarment({ id: 'g-001', status: 'active' }));
    await putGarment(makeGarment({ id: 'g-002', status: 'lost' }));
    await putGarment(makeGarment({ id: 'g-003', status: 'removed' }));

    const active = await getGarmentsByStatus('active');
    const lost = await getGarmentsByStatus('lost');

    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('g-001');
    expect(lost).toHaveLength(1);
    expect(lost[0].id).toBe('g-002');
  });

  it('setGarmentStatus updates status and preserves the photo blob', async () => {
    await putGarment(makeGarment({ id: 'g-001', status: 'active' }));
    await setGarmentStatus('g-001', 'returned');

    const g = await getGarment('g-001');
    expect(g!.status).toBe('returned');
    expect(await readBlobAsText(g!.photoBlob)).toBe('photo');

    // 'returned' garments drop out of the active catalog
    expect(await getGarmentsByStatus('active')).toHaveLength(0);
    expect(await getGarmentsByStatus('returned')).toHaveLength(1);
  });

  it('setGarmentStatus is a no-op for a missing garment', async () => {
    await setGarmentStatus('nope', 'returned');
    expect(await getGarment('nope')).toBeUndefined();
  });
});

// ─── Blob round-trip ─────────────────────────────────────────────────────────

describe('blob round-trip', () => {
  it('stores and retrieves photo blob with correct type and content', async () => {
    const photoContent = 'fake-jpeg-bytes-\xFF\xD8\xFF';
    const photoBlob = new Blob([photoContent], { type: 'image/jpeg' });
    await putGarment(makeGarment({ photoBlob }));

    const retrieved = await getGarment('g-001');
    expect(retrieved!.photoBlob).toBeInstanceOf(Blob);
    expect(retrieved!.photoBlob.type).toBe('image/jpeg');

    const text = await readBlobAsText(retrieved!.photoBlob);
    expect(text).toBe(photoContent);
  });

  it('stores and retrieves receipt blob in a batch', async () => {
    const receiptContent = 'fake-receipt-image';
    const receiptBlob = new Blob([receiptContent], { type: 'image/png' });
    await putBatch(makeBatch({ receiptBlob }));

    const retrieved = await getBatch('b-001');
    expect(retrieved!.receiptBlob).toBeInstanceOf(Blob);
    expect(retrieved!.receiptBlob!.type).toBe('image/png');

    const text = await readBlobAsText(retrieved!.receiptBlob!);
    expect(text).toBe(receiptContent);
  });

  it('allows null receiptBlob', async () => {
    await putBatch(makeBatch({ receiptBlob: null }));
    const retrieved = await getBatch('b-001');
    expect(retrieved!.receiptBlob).toBeNull();
  });

  it('blob survives an update (put over existing)', async () => {
    const blob1 = new Blob(['original'], { type: 'image/jpeg' });
    const blob2 = new Blob(['updated'], { type: 'image/jpeg' });

    await putGarment(makeGarment({ photoBlob: blob1 }));
    await putGarment(makeGarment({ photoBlob: blob2 }));

    const retrieved = await getGarment('g-001');
    const text = await readBlobAsText(retrieved!.photoBlob);
    expect(text).toBe('updated');
  });
});

// ─── Batches ─────────────────────────────────────────────────────────────────

describe('batch CRUD', () => {
  it('puts and retrieves a batch', async () => {
    const b = makeBatch();
    await putBatch(b);
    const retrieved = await getBatch('b-001');
    expect(retrieved).toBeDefined();
    expect(retrieved!.shopName).toBe('Clean & Fold');
    expect(retrieved!.amountINR).toBe(250);
    expect(retrieved!.items).toHaveLength(1);
    expect(retrieved!.items[0].state).toBe('out');
  });

  it('returns undefined for missing batch id', async () => {
    expect(await getBatch('nonexistent')).toBeUndefined();
  });

  it('getAll returns all batches', async () => {
    await putBatch(makeBatch({ id: 'b-001' }));
    await putBatch(makeBatch({ id: 'b-002' }));
    expect(await getAllBatches()).toHaveLength(2);
  });

  it('getBatchesByStatus filters correctly', async () => {
    await putBatch(makeBatch({ id: 'b-001', status: 'active' }));
    await putBatch(makeBatch({ id: 'b-002', status: 'awaiting' }));
    await putBatch(makeBatch({ id: 'b-003', status: 'closed' }));

    expect(await getBatchesByStatus('active')).toHaveLength(1);
    expect(await getBatchesByStatus('awaiting')).toHaveLength(1);
    expect(await getBatchesByStatus('closed')).toHaveLength(1);
  });

  it('updates batch items on re-put', async () => {
    await putBatch(makeBatch());
    const updated = makeBatch({
      items: [{ garmentId: 'g-001', state: 'received' }],
    });
    await putBatch(updated);
    const retrieved = await getBatch('b-001');
    expect(retrieved!.items[0].state).toBe('received');
  });

  it('deletes a batch', async () => {
    await putBatch(makeBatch());
    await deleteBatch('b-001');
    expect(await getBatch('b-001')).toBeUndefined();
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

describe('settings', () => {
  it('sets and gets a string setting', async () => {
    await setSetting('lastShop', 'Sunrise Laundry');
    const val = await getSetting('lastShop');
    expect(val).toBe('Sunrise Laundry');
  });

  it('sets and gets schemaVersion', async () => {
    await setSetting('schemaVersion', 1);
    const val = await getSetting('schemaVersion');
    expect(val).toBe(1);
  });

  it('returns undefined for unset key', async () => {
    expect(await getSetting('lastShop')).toBeUndefined();
  });

  it('overwrites existing setting', async () => {
    await setSetting('lastShop', 'Old Shop');
    await setSetting('lastShop', 'New Shop');
    expect(await getSetting('lastShop')).toBe('New Shop');
  });

  it('getAllSettings returns all set values', async () => {
    await setSetting('lastShop', 'Test Shop');
    await setSetting('schemaVersion', 1);
    const all = await getAllSettings();
    expect(all.lastShop).toBe('Test Shop');
    expect(all.schemaVersion).toBe(1);
  });
});
