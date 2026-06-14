# Data Model

Laundristic relies on a simple, relational IndexedDB schema (v1) to track garments, batches, and system settings. All data manipulation is handled via pure functions in `src/lib/domain.ts` and persisted via `src/lib/storage.ts`.

## Core Entities

### Garment

Represents a physical item of clothing or linen.

```ts
export interface Garment {
  id: string; // UUID
  code: string; // Human readable code (e.g., SHT-01)
  type: GarmentCategory; // e.g., 'SHT', 'TRO', 'BED'
  photoBlob: Blob; // Binary image data
  status: GarmentStatus; // 'active' | 'lost' | 'removed'
  createdAt: number; // Timestamp
}
```

- **ID Generation:** Internal `id`s are immutable UUIDs. Display `code`s are generated using a `PREFIX-NN` format (e.g., `SHT-01`). The system calculates the next number by finding the maximum existing number for that prefix and adding 1.

### Batch

Represents a single transaction with the laundry shop.

```ts
export interface Batch {
  id: string; // UUID
  shopName: string; // Name of the laundry shop
  date: number; // Drop-off timestamp
  amountINR: number; // Cost of the service
  receiptBlob: Blob | null; // Binary image of the paper receipt
  status: BatchStatus; // 'active' | 'awaiting' | 'closed'
  items: BatchItem[]; // Array of items in this batch
}
```

### BatchItem

Represents the state of a specific Garment within a Batch.

```ts
export interface BatchItem {
  garmentId: string; // Foreign key to Garment.id
  state: ItemState; // 'out' | 'received' | 'missing' | 'found' | 'lost'
}
```

### Settings

Stores user preferences and migration state.

```ts
export interface Settings {
  lastShop: string; // Pre-fills the drop-off shop name
  schemaVersion: number; // Used for future IndexedDB migrations
}
```

## State Machines

The application relies heavily on strict state transitions to ensure data integrity, especially during the critical "missing item loop."

### Batch Status Lifecycle

1. **`active`**: The batch is currently at the laundry shop.
2. **`awaiting`**: The user checked in the batch, but some items were marked as missing. The batch remains open until these items are resolved.
3. **`closed`**: All items are returned or definitively marked as lost.

### BatchItem State Lifecycle

1. **`out`**: The garment is currently at the shop.
2. **`received`**: The garment was returned successfully.
3. **`missing`**: The user checked in the batch, but this garment was not returned.
4. **`found`**: A previously missing garment was recovered.
5. **`lost`**: A previously missing garment was declared lost by the shop. (This transition also automatically updates the `Garment.status` to `'lost'`).

### Automated State Resolution

The domain logic (`isBatchResolvable`) constantly monitors batches in the `awaiting` state. If all `missing` items inside the batch are resolved (transitioned to either `found` or `lost`), the batch is automatically transitioned to `closed`.
