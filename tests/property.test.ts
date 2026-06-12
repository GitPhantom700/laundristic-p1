import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  canTransitionBatch,
  transitionBatch,
  canTransitionItem,
  transitionItem,
  transitionBatchItem,
  closeCheckIn,
  computeSpendStats,
  getMonthlySpendWindow,
} from '../src/lib/domain';
import * as storage from '../src/lib/storage';
import type {
  Batch,
  BatchItem,
  BatchStatus,
  ItemState,
  Garment,
} from '../src/lib/types';
import 'fake-indexeddb/auto';
import { clearDb } from '../src/lib/db';

// ─── Generators ──────────────────────────────────────────────────────────────

const batchStatusArbitrary = fc.constantFrom<BatchStatus>(
  'active',
  'awaiting',
  'closed',
);
const itemStateArbitrary = fc.constantFrom<ItemState>(
  'out',
  'received',
  'missing',
  'found',
  'lost',
);

const batchItemArbitrary = fc.record({
  id: fc.uuid(),
  batchId: fc.uuid(),
  garmentId: fc.uuid(),
  state: itemStateArbitrary,
});

const batchArbitrary = fc.record({
  id: fc.uuid(),
  shopName: fc.string(),
  date: fc.date().map((d) => d.getTime()),
  amountINR: fc.integer({ min: 0, max: 100000 }),
  receiptBlob: fc.constant(null),
  status: batchStatusArbitrary,
  items: fc.array(batchItemArbitrary, { maxLength: 20 }),
});

const garmentCategoryArbitrary = fc.constantFrom(
  'Tops',
  'Bottoms',
  'Outerwear',
  'Undergarments',
  'Accessories',
  'Household',
);

const garmentArbitrary = fc.record({
  id: fc.uuid(),
  code: fc.string(),
  type: garmentCategoryArbitrary,
  photoBlob: fc.constant(new Blob([])),
  status: fc.constantFrom('in', 'out'),
  createdAt: fc.date().map((d) => d.getTime()),
} as any);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('domain.ts Properties', () => {
  describe('Derived fields consistency', () => {
    it('avgPerDrop * dropCount === totalSpend when dropCount > 0', () => {
      fc.assert(
        fc.property(fc.array(batchArbitrary), (batches) => {
          const stats = computeSpendStats(batches);
          if (stats.dropCount > 0) {
            // Use closeTo to account for floating point errors
            expect(stats.avgPerDrop * stats.dropCount).toBeCloseTo(
              stats.totalSpend,
            );
          } else {
            expect(stats.totalSpend).toBe(0);
            expect(stats.avgPerDrop).toBe(0);
          }
        }),
      );
    });
  });

  describe('No double-counting/dropped batches in grouping', () => {
    it('Sum of all monthlySpend[].spend === totalSpend', () => {
      fc.assert(
        fc.property(fc.array(batchArbitrary), (batches) => {
          const stats = computeSpendStats(batches);
          const sumMonthly = stats.monthlySpend.reduce(
            (sum, m) => sum + m.spend,
            0,
          );
          expect(sumMonthly).toBe(stats.totalSpend);
        }),
      );
    });
  });

  describe('fromMs filter exclusion', () => {
    it('No batch with date < fromMs contributes to totalSpend', () => {
      fc.assert(
        fc.property(
          fc.array(batchArbitrary),
          fc.date().map((d) => d.getTime()),
          (batches, fromMs) => {
            const stats = computeSpendStats(batches, fromMs);
            const invalidBatches = batches.filter(
              (b) => b.status === 'closed' && b.date < fromMs,
            );
            const invalidSpend = invalidBatches.reduce(
              (sum, b) => sum + b.amountINR,
              0,
            );

            if (invalidSpend > 0) {
              // Total spend must not include the invalid spend
              const totalPossibleSpend = batches
                .filter((b) => b.status === 'closed')
                .reduce((sum, b) => sum + b.amountINR, 0);
              expect(stats.totalSpend).toBeLessThanOrEqual(
                totalPossibleSpend - invalidSpend,
              );
            }
          },
        ),
      );
    });
  });

  describe('Output stability', () => {
    it('getMonthlySpendWindow(batches, N) always returns exactly N entries', () => {
      fc.assert(
        fc.property(
          fc.array(batchArbitrary),
          fc.integer({ min: 1, max: 24 }),
          (batches, n) => {
            const window = getMonthlySpendWindow(batches, n);
            expect(window).toHaveLength(n);
          },
        ),
      );
    });
  });

  describe('State resolution logic', () => {
    it("closeCheckIn with a full received set always produces status === 'closed' and zero missing items", () => {
      fc.assert(
        fc.property(batchArbitrary, (batch) => {
          // Force all items to 'out' state for this test, because closeCheckIn only
          // operates on items currently marked 'out'.
          const testBatch = { ...batch, items: batch.items.map(i => ({ ...i, state: 'out' as const })) };
          
          // Collect all garment IDs
          const allGarmentIds = testBatch.items.map((i) => i.garmentId);
          const fullSet = new Set(allGarmentIds);
          
          const result = closeCheckIn(testBatch, fullSet);

          expect(result.status).toBe('closed');
          const missingItems = result.items.filter(
            (i) => i.state === 'missing',
          );
          expect(missingItems).toHaveLength(0);
        }),
      );
    });
  });

  describe('Immutability', () => {
    it('transitionBatch and transitionItem never mutate the input object', () => {
      fc.assert(
        fc.property(
          batchArbitrary,
          batchStatusArbitrary,
          batchItemArbitrary,
          itemStateArbitrary,
          (batch, newStatus, item, newItemState) => {
            if (canTransitionBatch(batch.status, newStatus)) {
              const originalRef = batch;
              const originalStr = JSON.stringify(batch);
              const result = transitionBatch(batch, newStatus);
              expect(result).not.toBe(originalRef);
              expect(JSON.stringify(batch)).toBe(originalStr);
            }
            if (canTransitionItem(item.state, newItemState)) {
              const originalRef = item;
              const originalStr = JSON.stringify(item);
              const result = transitionItem(item, newItemState);
              expect(result).not.toBe(originalRef);
              expect(JSON.stringify(item)).toBe(originalStr);
            }
          },
        ),
      );
    });
  });
});

describe('storage.ts Edge Cases', () => {
  beforeEach(async () => {
    await clearDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  it('getAllGarments returns all garments across every GarmentCategory type', async () => {
    const categories = [
      'Tops',
      'Bottoms',
      'Outerwear',
      'Undergarments',
      'Accessories',
      'Household',
    ] as const;
    for (const cat of categories) {
      await storage.putGarment({
        id: `g-${cat}`,
        code: `C-${cat}`,
        type: cat,
        photoBlob: new Blob(['']),
        status: 'in',
        createdAt: Date.now(),
      });
    }

    const all = await storage.getAllGarments();
    expect(all).toHaveLength(6);
    const typesReturned = all.map((g) => g.type);
    categories.forEach((cat) => {
      expect(typesReturned).toContain(cat);
    });
  });

  it('Batch with zero items stores and retrieves correctly', async () => {
    const batch: Batch = {
      id: 'b-zero',
      shopName: 'Test Shop',
      date: Date.now(),
      amountINR: 100,
      receiptBlob: null,
      status: 'closed',
      items: [],
    };
    await storage.putBatch(batch);
    const retrieved = await storage.getBatch('b-zero');
    expect(retrieved).toBeDefined();
    expect(retrieved?.items).toHaveLength(0);
  });

  it('getAllBatches with a mix of active/awaiting/closed returns all of them', async () => {
    const statuses: BatchStatus[] = ['active', 'awaiting', 'closed'];
    for (const s of statuses) {
      await storage.putBatch({
        id: `b-${s}`,
        shopName: 'Shop',
        date: Date.now(),
        amountINR: 50,
        receiptBlob: null,
        status: s,
        items: [],
      });
    }

    const all = await storage.getAllBatches();
    expect(all).toHaveLength(3);
    const statusReturned = all.map((b) => b.status);
    statuses.forEach((s) => {
      expect(statusReturned).toContain(s);
    });
  });

  it('Settings overwrite is idempotent: writing the same key twice returns the last value', async () => {
    await storage.setSetting('garmentCount', 10);
    await storage.setSetting('garmentCount', 42);

    const val = await storage.getSetting('garmentCount');
    expect(val).toBe(42);
  });

  it('getGarmentsByStatus returns an empty array (not undefined) when no matches exist', async () => {
    // DB is empty initially
    const result = await storage.getGarmentsByStatus('out');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
