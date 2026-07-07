export type GarmentStatus = 'active' | 'lost' | 'removed' | 'returned';

export type ItemState = 'out' | 'received' | 'missing' | 'found' | 'lost';

export type BatchStatus = 'active' | 'awaiting' | 'closed';

export type GarmentCategory =
  'SHT' | 'TEE' | 'TRO' | 'HOO' | 'KUR' | 'BED' | 'PIL' | 'SHO' | 'ITM';

export interface Garment {
  id: string;
  code: string;
  type: GarmentCategory;
  photoBlob: Blob;
  status: GarmentStatus;
  createdAt: number;
}

export interface BatchItem {
  garmentId: string;
  state: ItemState;
}

export interface Batch {
  id: string;
  shopName: string;
  date: number;
  amountINR: number;
  receiptBlob: Blob | null;
  status: BatchStatus;
  items: BatchItem[];
}

export interface Settings {
  lastShop: string;
  schemaVersion: number;
  /** 1 once the first-run welcome screen has been completed. */
  onboarded: number;
}
