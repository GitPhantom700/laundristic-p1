import type { Batch, BatchItem, BatchStatus, ItemState } from './types';

// ─── Batch lifecycle ──────────────────────────────────────────────────────────

/**
 * Legal batch transitions:
 *   active   → awaiting  (check-in finds short count)
 *   active   → closed    (check-in finds full count)
 *   awaiting → closed    (all missing items resolved)
 */
const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  active: ['awaiting', 'closed'],
  awaiting: ['closed'],
  closed: [],
};

export function canTransitionBatch(
  from: BatchStatus,
  to: BatchStatus,
): boolean {
  return BATCH_TRANSITIONS[from].includes(to);
}

export function transitionBatch(batch: Batch, to: BatchStatus): Batch {
  if (!canTransitionBatch(batch.status, to)) {
    throw new Error(`Illegal batch transition: ${batch.status} → ${to}`);
  }
  return { ...batch, status: to };
}

// ─── Item state machine ───────────────────────────────────────────────────────

/**
 * Legal item transitions:
 *   out      → received  (checked back in)
 *   out      → missing   (flagged short during check-in)
 *   missing  → found     (shop produces item)
 *   missing  → lost      (item confirmed lost)
 */
const ITEM_TRANSITIONS: Record<ItemState, ItemState[]> = {
  out: ['received', 'missing'],
  received: [],
  missing: ['found', 'lost'],
  found: [],
  lost: [],
};

export function canTransitionItem(from: ItemState, to: ItemState): boolean {
  return ITEM_TRANSITIONS[from].includes(to);
}

export function transitionItem(item: BatchItem, to: ItemState): BatchItem {
  if (!canTransitionItem(item.state, to)) {
    throw new Error(`Illegal item transition: ${item.state} → ${to}`);
  }
  return { ...item, state: to };
}

/**
 * Updates a single item within a batch by garmentId. Returns a new Batch.
 * Throws if the garmentId is not found or the transition is illegal.
 */
export function transitionBatchItem(
  batch: Batch,
  garmentId: string,
  to: ItemState,
): Batch {
  const idx = batch.items.findIndex((i) => i.garmentId === garmentId);
  if (idx === -1) {
    throw new Error(`Garment ${garmentId} not found in batch ${batch.id}`);
  }
  const updatedItems = batch.items.map((item, i) =>
    i === idx ? transitionItem(item, to) : item,
  );
  return { ...batch, items: updatedItems };
}

// ─── Check-in helpers ─────────────────────────────────────────────────────────

/**
 * Marks all still-out items as missing and advances batch to awaiting or closed.
 * - If any items were marked missing → awaiting
 * - If all items are received/found → closed
 */
export function closeCheckIn(batch: Batch, receivedIds: Set<string>): Batch {
  const updatedItems = batch.items.map((item) => {
    if (item.state !== 'out') return item;
    return {
      ...item,
      state: receivedIds.has(item.garmentId) ? 'received' : 'missing',
    } as BatchItem;
  });

  const hasMissing = updatedItems.some((i) => i.state === 'missing');
  const newStatus: BatchStatus = hasMissing ? 'awaiting' : 'closed';

  return { ...batch, items: updatedItems, status: newStatus };
}

/**
 * Returns true if all items in the batch are in a terminal state
 * (received, found, or lost) — i.e., the batch can be closed.
 */
export function isBatchResolvable(batch: Batch): boolean {
  return batch.items.every((i) =>
    (['received', 'found', 'lost'] as ItemState[]).includes(i.state),
  );
}

// ─── Spend aggregations ───────────────────────────────────────────────────────

export interface SpendStats {
  totalSpend: number;
  dropCount: number;
  avgPerDrop: number;
  avgPerGarment: number;
  monthlySpend: MonthlySpend[];
}

export interface MonthlySpend {
  year: number;
  month: number; // 1–12
  spend: number;
}

/**
 * Computes spend stats from a list of closed batches within an optional
 * date range [fromMs, toMs]. Batches outside the range are excluded.
 */
export function computeSpendStats(
  batches: Batch[],
  fromMs?: number,
  toMs?: number,
): SpendStats {
  const filtered = batches.filter((b) => {
    if (b.status !== 'closed') return false;
    if (fromMs !== undefined && b.date < fromMs) return false;
    if (toMs !== undefined && b.date > toMs) return false;
    return true;
  });

  const totalSpend = filtered.reduce((sum, b) => sum + b.amountINR, 0);
  const dropCount = filtered.length;
  const totalGarments = filtered.reduce((sum, b) => sum + b.items.length, 0);

  const monthlyMap = new Map<string, MonthlySpend>();
  for (const b of filtered) {
    const d = new Date(b.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${month}`;
    const existing = monthlyMap.get(key) ?? { year, month, spend: 0 };
    monthlyMap.set(key, { ...existing, spend: existing.spend + b.amountINR });
  }

  const monthlySpend = [...monthlyMap.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  return {
    totalSpend,
    dropCount,
    avgPerDrop: dropCount > 0 ? totalSpend / dropCount : 0,
    avgPerGarment: totalGarments > 0 ? totalSpend / totalGarments : 0,
    monthlySpend,
  };
}

/**
 * Returns the last N months of spend data (padded with zero-spend months
 * where no drop-offs occurred), ordered oldest→newest.
 */
export function getMonthlySpendWindow(
  batches: Batch[],
  months = 6,
): MonthlySpend[] {
  const now = new Date();
  const window: MonthlySpend[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    window.push({ year: d.getFullYear(), month: d.getMonth() + 1, spend: 0 });
  }

  const fromMs = new Date(window[0].year, window[0].month - 1, 1).getTime();
  const stats = computeSpendStats(batches, fromMs);

  return window.map((slot) => {
    const found = stats.monthlySpend.find(
      (m) => m.year === slot.year && m.month === slot.month,
    );
    return found ?? slot;
  });
}
