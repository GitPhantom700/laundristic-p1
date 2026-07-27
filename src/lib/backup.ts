import { blobToStored } from './db';
import { getAllGarments, getAllBatches, putGarment, putBatch } from './storage';
import type { Garment, Batch } from './types';
import { createZip, readZip } from './zip';

const MANIFEST_VERSION = 1;
const MANIFEST_FILE = 'backup.json';
const PHOTO_DIR = 'photos';
const RECEIPT_DIR = 'receipts';

interface SerializedGarment {
  id: string;
  code: string;
  type: string;
  status: string;
  createdAt: number;
  photoFile: string;
}

interface SerializedBatch {
  id: string;
  shopName: string;
  date: number;
  amountINR: number;
  status: string;
  items: { garmentId: string; state: string }[];
  receiptFile: string | null;
}

interface BackupManifest {
  version: number;
  exportedAt: string;
  garments: SerializedGarment[];
  batches: SerializedBatch[];
}

export interface ImportResult {
  garments: number;
  batches: number;
}

/** Derive a short extension from a MIME type string. */
function mimeToExt(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  const part = mime.split('/')[1];
  return part || 'bin';
}

/** Derive MIME type from a file extension. */
function extToMime(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return `image/${ext}`;
}

/**
 * Export all garments and batches as a ZIP archive.
 * Archive layout:
 *   backup.json         – JSON manifest (version, metadata, garment/batch lists)
 *   photos/<id>.jpg     – one file per garment photo
 *   receipts/<id>.jpg   – one file per batch receipt (if present)
 */
export async function exportBackup(): Promise<Blob> {
  const [garments, batches] = await Promise.all([
    getAllGarments(),
    getAllBatches(),
  ]);

  const entries: { name: string; data: Uint8Array }[] = [];
  const serializedGarments: SerializedGarment[] = [];
  const serializedBatches: SerializedBatch[] = [];

  // Prepare all blobs BEFORE touching IDB again (keep IDB tx safety rule in mind)
  for (const g of garments) {
    const stored = await blobToStored(g.photoBlob);
    const ext = mimeToExt(stored.type);
    const photoFile = `${PHOTO_DIR}/${g.id}.${ext}`;
    entries.push({ name: photoFile, data: new Uint8Array(stored.buffer) });
    serializedGarments.push({
      id: g.id,
      code: g.code,
      type: g.type,
      status: g.status,
      createdAt: g.createdAt,
      photoFile,
    });
  }

  for (const b of batches) {
    let receiptFile: string | null = null;
    if (b.receiptBlob) {
      const stored = await blobToStored(b.receiptBlob);
      const ext = mimeToExt(stored.type);
      receiptFile = `${RECEIPT_DIR}/${b.id}.${ext}`;
      entries.push({ name: receiptFile, data: new Uint8Array(stored.buffer) });
    }
    serializedBatches.push({
      id: b.id,
      shopName: b.shopName,
      date: b.date,
      amountINR: b.amountINR,
      status: b.status,
      items: b.items,
      receiptFile,
    });
  }

  const manifest: BackupManifest = {
    version: MANIFEST_VERSION,
    exportedAt: new Date().toISOString(),
    garments: serializedGarments,
    batches: serializedBatches,
  };

  const manifestBytes = new TextEncoder().encode(
    JSON.stringify(manifest, null, 2),
  );
  const zip = createZip([
    { name: MANIFEST_FILE, data: manifestBytes },
    ...entries,
  ]);
  return new Blob([zip], { type: 'application/zip' });
}

function validateManifest(m: unknown): m is BackupManifest {
  if (typeof m !== 'object' || m === null) return false;
  const manifest = m as Record<string, unknown>;
  if (manifest.version !== MANIFEST_VERSION) return false;
  if (!Array.isArray(manifest.garments) || !Array.isArray(manifest.batches))
    return false;
  for (const g of manifest.garments as unknown[]) {
    if (typeof g !== 'object' || g === null) return false;
    const gg = g as Record<string, unknown>;
    if (
      typeof gg.id !== 'string' ||
      typeof gg.code !== 'string' ||
      typeof gg.type !== 'string' ||
      typeof gg.status !== 'string' ||
      typeof gg.createdAt !== 'number' ||
      typeof gg.photoFile !== 'string'
    )
      return false;
  }
  for (const b of manifest.batches as unknown[]) {
    if (typeof b !== 'object' || b === null) return false;
    const bb = b as Record<string, unknown>;
    if (
      typeof bb.id !== 'string' ||
      typeof bb.shopName !== 'string' ||
      typeof bb.date !== 'number' ||
      typeof bb.amountINR !== 'number' ||
      typeof bb.status !== 'string' ||
      !Array.isArray(bb.items)
    )
      return false;
  }
  return true;
}

/**
 * Import a backup ZIP file created by exportBackup.
 * Validates structure and photo/receipt integrity before writing anything.
 * Existing records with the same ID are overwritten (upsert semantics).
 */
export async function importBackup(file: File): Promise<ImportResult> {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

  let files: Map<string, Uint8Array>;
  try {
    files = readZip(new Uint8Array(buffer));
  } catch (err) {
    throw new Error(`Invalid backup file: ${(err as Error).message}`, {
      cause: err,
    });
  }

  const manifestBytes = files.get(MANIFEST_FILE);
  if (!manifestBytes) throw new Error('Invalid backup: missing backup.json');

  let manifest: unknown;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    throw new Error('Invalid backup: backup.json is not valid JSON');
  }

  if (!validateManifest(manifest)) {
    throw new Error(
      'Invalid backup: manifest structure is invalid or version mismatch',
    );
  }

  // Integrity check — verify all referenced files exist before writing anything
  for (const g of manifest.garments) {
    if (!files.has(g.photoFile)) {
      throw new Error(
        `Integrity check failed: missing photo for garment ${g.id} (${g.photoFile})`,
      );
    }
  }
  for (const b of manifest.batches) {
    if (b.receiptFile && !files.has(b.receiptFile)) {
      throw new Error(
        `Integrity check failed: missing receipt for batch ${b.id} (${b.receiptFile})`,
      );
    }
  }

  // Restore garments
  for (const sg of manifest.garments) {
    const photoData = files.get(sg.photoFile)!;
    const ext = sg.photoFile.split('.').pop() ?? 'jpg';
    const photoBlob = new Blob([photoData], { type: extToMime(ext) });
    await putGarment({
      id: sg.id,
      code: sg.code,
      type: sg.type as Garment['type'],
      status: sg.status as Garment['status'],
      createdAt: sg.createdAt,
      photoBlob,
    });
  }

  // Restore batches
  for (const sb of manifest.batches) {
    let receiptBlob: Blob | null = null;
    if (sb.receiptFile) {
      const receiptData = files.get(sb.receiptFile)!;
      const ext = sb.receiptFile.split('.').pop() ?? 'jpg';
      receiptBlob = new Blob([receiptData], { type: extToMime(ext) });
    }
    await putBatch({
      id: sb.id,
      shopName: sb.shopName,
      date: sb.date,
      amountINR: sb.amountINR,
      status: sb.status as Batch['status'],
      items: sb.items as Batch['items'],
      receiptBlob,
    });
  }

  return {
    garments: manifest.garments.length,
    batches: manifest.batches.length,
  };
}
