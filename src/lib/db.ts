import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GarmentStatus, BatchStatus } from './types';

const DB_NAME = 'laundristic';
const DB_VERSION = 1;

/** Internal representation stored in IDB — Blob replaced by binary buffer for portability. */
export interface StoredBlob {
  buffer: ArrayBuffer;
  type: string;
}

export interface StoredGarment {
  id: string;
  code: string;
  type: string;
  photo: StoredBlob;
  status: GarmentStatus;
  createdAt: number;
}

export interface StoredBatch {
  id: string;
  shopName: string;
  date: number;
  amountINR: number;
  receipt: StoredBlob | null;
  status: BatchStatus;
  items: Array<{ garmentId: string; state: string }>;
}

interface LaundrisiticDB extends DBSchema {
  garments: {
    key: string;
    value: StoredGarment;
    indexes: { byStatus: GarmentStatus; byType: string; byCreatedAt: number };
  };
  batches: {
    key: string;
    value: StoredBatch;
    indexes: { byStatus: BatchStatus; byDate: number };
  };
  settings: {
    key: string;
    value: string | number;
  };
}

let dbPromise: Promise<IDBPDatabase<LaundrisiticDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<LaundrisiticDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LaundrisiticDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const garmentStore = db.createObjectStore('garments', { keyPath: 'id' });
          garmentStore.createIndex('byStatus', 'status');
          garmentStore.createIndex('byType', 'type');
          garmentStore.createIndex('byCreatedAt', 'createdAt');

          const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
          batchStore.createIndex('byStatus', 'status');
          batchStore.createIndex('byDate', 'date');

          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

/** Resets DB connection and deletes the database — use in tests via beforeEach. */
export async function clearDb(): Promise<void> {
  const db = await getDb();
  db.close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

export function blobToStored(blob: Blob): Promise<StoredBlob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({ buffer: reader.result as ArrayBuffer, type: blob.type });
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export function storedToBlob(stored: StoredBlob): Blob {
  return new Blob([stored.buffer], { type: stored.type });
}
