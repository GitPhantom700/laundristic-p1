import { getDb, blobToStored, storedToBlob } from './db';
import type {
  Garment,
  Batch,
  Settings,
  GarmentStatus,
  BatchStatus,
} from './types';

// ─── Garments ────────────────────────────────────────────────────────────────

export async function putGarment(garment: Garment): Promise<void> {
  const db = await getDb();
  await db.put('garments', {
    id: garment.id,
    code: garment.code,
    type: garment.type,
    photo: await blobToStored(garment.photoBlob),
    status: garment.status,
    createdAt: garment.createdAt,
  });
}

export async function getGarment(id: string): Promise<Garment | undefined> {
  const db = await getDb();
  const stored = await db.get('garments', id);
  if (!stored) return undefined;
  return {
    ...stored,
    type: stored.type as Garment['type'],
    photoBlob: storedToBlob(stored.photo),
  };
}

export async function getAllGarments(): Promise<Garment[]> {
  const db = await getDb();
  const all = await db.getAll('garments');
  return all.map((s) => ({
    ...s,
    type: s.type as Garment['type'],
    photoBlob: storedToBlob(s.photo),
  }));
}

export async function getGarmentsByStatus(
  status: GarmentStatus,
): Promise<Garment[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('garments', 'byStatus', status);
  return all.map((s) => ({
    ...s,
    type: s.type as Garment['type'],
    photoBlob: storedToBlob(s.photo),
  }));
}

export async function deleteGarment(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('garments', id);
}

// ─── Batches ─────────────────────────────────────────────────────────────────

export async function putBatch(batch: Batch): Promise<void> {
  const db = await getDb();
  await db.put('batches', {
    id: batch.id,
    shopName: batch.shopName,
    date: batch.date,
    amountINR: batch.amountINR,
    receipt: batch.receiptBlob ? await blobToStored(batch.receiptBlob) : null,
    status: batch.status,
    items: batch.items,
  });
}

export async function getBatch(id: string): Promise<Batch | undefined> {
  const db = await getDb();
  const stored = await db.get('batches', id);
  if (!stored) return undefined;
  return {
    ...stored,
    status: stored.status as Batch['status'],
    receiptBlob: stored.receipt ? storedToBlob(stored.receipt) : null,
    items: stored.items as Batch['items'],
  };
}

export async function getAllBatches(): Promise<Batch[]> {
  const db = await getDb();
  const all = await db.getAll('batches');
  return all.map((s) => ({
    ...s,
    status: s.status as Batch['status'],
    receiptBlob: s.receipt ? storedToBlob(s.receipt) : null,
    items: s.items as Batch['items'],
  }));
}

export async function getBatchesByStatus(
  status: BatchStatus,
): Promise<Batch[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('batches', 'byStatus', status);
  return all.map((s) => ({
    ...s,
    status: s.status as Batch['status'],
    receiptBlob: s.receipt ? storedToBlob(s.receipt) : null,
    items: s.items as Batch['items'],
  }));
}

export async function deleteBatch(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('batches', id);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting<K extends keyof Settings>(
  key: K,
): Promise<Settings[K] | undefined> {
  const db = await getDb();
  return db.get('settings', key) as Promise<Settings[K] | undefined>;
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  const db = await getDb();
  await db.put('settings', value as string | number, key);
}

export async function getAllSettings(): Promise<Partial<Settings>> {
  const db = await getDb();
  const keys = await db.getAllKeys('settings');
  const result: Partial<Settings> = {};
  for (const key of keys) {
    const k = key as keyof Settings;
    const val = await db.get('settings', key);
    (result as Record<string, unknown>)[k] = val;
  }
  return result;
}

// ─── Storage persistence ─────────────────────────────────────────────────────

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
}

export async function isStoragePersisted(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    return navigator.storage.persisted();
  }
  return false;
}
