import { describe, it, expect } from 'vitest';
import {
  canTransitionBatch,
  transitionBatch,
  canTransitionItem,
  transitionItem,
  transitionBatchItem,
  closeCheckIn,
  isBatchResolvable,
  computeSpendStats,
  getMonthlySpendWindow,
} from '../src/lib/domain';
import type { Batch, BatchItem } from '../src/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'b-001',
    shopName: 'Clean & Fold',
    date: Date.now(),
    amountINR: 200,
    receiptBlob: null,
    status: 'active',
    items: [
      { garmentId: 'g-001', state: 'out' },
      { garmentId: 'g-002', state: 'out' },
    ],
    ...overrides,
  };
}

function makeItem(overrides: Partial<BatchItem> = {}): BatchItem {
  return { garmentId: 'g-001', state: 'out', ...overrides };
}

// ─── Batch transition: legal paths ───────────────────────────────────────────

describe('batch lifecycle — legal transitions', () => {
  it('active → awaiting', () => {
    const b = transitionBatch(makeBatch({ status: 'active' }), 'awaiting');
    expect(b.status).toBe('awaiting');
  });

  it('active → closed', () => {
    const b = transitionBatch(makeBatch({ status: 'active' }), 'closed');
    expect(b.status).toBe('closed');
  });

  it('awaiting → closed', () => {
    const b = transitionBatch(makeBatch({ status: 'awaiting' }), 'closed');
    expect(b.status).toBe('closed');
  });

  it('transitionBatch returns a new object (immutable)', () => {
    const original = makeBatch();
    const updated = transitionBatch(original, 'closed');
    expect(updated).not.toBe(original);
    expect(original.status).toBe('active');
  });
});

// ─── Batch transition: illegal paths ─────────────────────────────────────────

describe('batch lifecycle — illegal transitions', () => {
  it('closed → active throws', () => {
    expect(() =>
      transitionBatch(makeBatch({ status: 'closed' }), 'active'),
    ).toThrow();
  });

  it('closed → awaiting throws', () => {
    expect(() =>
      transitionBatch(makeBatch({ status: 'closed' }), 'awaiting'),
    ).toThrow();
  });

  it('closed → closed throws', () => {
    expect(() =>
      transitionBatch(makeBatch({ status: 'closed' }), 'closed'),
    ).toThrow();
  });

  it('awaiting → active throws', () => {
    expect(() =>
      transitionBatch(makeBatch({ status: 'awaiting' }), 'active'),
    ).toThrow();
  });

  it('awaiting → awaiting throws', () => {
    expect(() =>
      transitionBatch(makeBatch({ status: 'awaiting' }), 'awaiting'),
    ).toThrow();
  });

  it('active → active throws', () => {
    expect(() =>
      transitionBatch(makeBatch({ status: 'active' }), 'active'),
    ).toThrow();
  });
});

// ─── canTransitionBatch ───────────────────────────────────────────────────────

describe('canTransitionBatch', () => {
  it('returns true for legal transitions', () => {
    expect(canTransitionBatch('active', 'awaiting')).toBe(true);
    expect(canTransitionBatch('active', 'closed')).toBe(true);
    expect(canTransitionBatch('awaiting', 'closed')).toBe(true);
  });

  it('returns false for illegal transitions', () => {
    expect(canTransitionBatch('closed', 'active')).toBe(false);
    expect(canTransitionBatch('closed', 'awaiting')).toBe(false);
    expect(canTransitionBatch('awaiting', 'active')).toBe(false);
    expect(canTransitionBatch('active', 'active')).toBe(false);
    expect(canTransitionBatch('closed', 'closed')).toBe(false);
  });
});

// ─── Item transition: legal paths ────────────────────────────────────────────

describe('item state machine — legal transitions', () => {
  it('out → received', () => {
    expect(transitionItem(makeItem({ state: 'out' }), 'received').state).toBe(
      'received',
    );
  });

  it('out → missing', () => {
    expect(transitionItem(makeItem({ state: 'out' }), 'missing').state).toBe(
      'missing',
    );
  });

  it('missing → found', () => {
    expect(transitionItem(makeItem({ state: 'missing' }), 'found').state).toBe(
      'found',
    );
  });

  it('missing → lost', () => {
    expect(transitionItem(makeItem({ state: 'missing' }), 'lost').state).toBe(
      'lost',
    );
  });

  it('transitionItem returns a new object (immutable)', () => {
    const original = makeItem();
    const updated = transitionItem(original, 'received');
    expect(updated).not.toBe(original);
    expect(original.state).toBe('out');
  });
});

// ─── Item transition: illegal paths ──────────────────────────────────────────

describe('item state machine — illegal transitions', () => {
  it('received → out throws', () => {
    expect(() =>
      transitionItem(makeItem({ state: 'received' }), 'out'),
    ).toThrow();
  });

  it('received → missing throws', () => {
    expect(() =>
      transitionItem(makeItem({ state: 'received' }), 'missing'),
    ).toThrow();
  });

  it('received → found throws', () => {
    expect(() =>
      transitionItem(makeItem({ state: 'received' }), 'found'),
    ).toThrow();
  });

  it('found → missing throws', () => {
    expect(() =>
      transitionItem(makeItem({ state: 'found' }), 'missing'),
    ).toThrow();
  });

  it('found → lost throws', () => {
    expect(() =>
      transitionItem(makeItem({ state: 'found' }), 'lost'),
    ).toThrow();
  });

  it('lost → found throws', () => {
    expect(() =>
      transitionItem(makeItem({ state: 'lost' }), 'found'),
    ).toThrow();
  });

  it('lost → missing throws', () => {
    expect(() =>
      transitionItem(makeItem({ state: 'lost' }), 'missing'),
    ).toThrow();
  });

  it('out → out throws', () => {
    expect(() => transitionItem(makeItem({ state: 'out' }), 'out')).toThrow();
  });

  it('out → found throws', () => {
    expect(() => transitionItem(makeItem({ state: 'out' }), 'found')).toThrow();
  });

  it('out → lost throws', () => {
    expect(() => transitionItem(makeItem({ state: 'out' }), 'lost')).toThrow();
  });
});

// ─── canTransitionItem ────────────────────────────────────────────────────────

describe('canTransitionItem', () => {
  it('returns true for legal transitions', () => {
    expect(canTransitionItem('out', 'received')).toBe(true);
    expect(canTransitionItem('out', 'missing')).toBe(true);
    expect(canTransitionItem('missing', 'found')).toBe(true);
    expect(canTransitionItem('missing', 'lost')).toBe(true);
  });

  it('returns false for illegal transitions', () => {
    expect(canTransitionItem('received', 'out')).toBe(false);
    expect(canTransitionItem('found', 'missing')).toBe(false);
    expect(canTransitionItem('lost', 'found')).toBe(false);
    expect(canTransitionItem('out', 'found')).toBe(false);
  });
});

// ─── transitionBatchItem ─────────────────────────────────────────────────────

describe('transitionBatchItem', () => {
  it('updates the correct item by garmentId', () => {
    const batch = makeBatch();
    const updated = transitionBatchItem(batch, 'g-001', 'received');
    expect(updated.items[0].state).toBe('received');
    expect(updated.items[1].state).toBe('out'); // unchanged
  });

  it('throws if garmentId not in batch', () => {
    expect(() =>
      transitionBatchItem(makeBatch(), 'g-999', 'received'),
    ).toThrow();
  });

  it('throws on illegal item transition', () => {
    const batch = makeBatch({
      items: [{ garmentId: 'g-001', state: 'received' }],
    });
    expect(() => transitionBatchItem(batch, 'g-001', 'missing')).toThrow();
  });

  it('does not mutate the original batch', () => {
    const batch = makeBatch();
    transitionBatchItem(batch, 'g-001', 'received');
    expect(batch.items[0].state).toBe('out');
  });
});

// ─── closeCheckIn ────────────────────────────────────────────────────────────

describe('closeCheckIn', () => {
  it('all received → status closed', () => {
    const batch = makeBatch();
    const result = closeCheckIn(batch, new Set(['g-001', 'g-002']));
    expect(result.status).toBe('closed');
    expect(result.items.every((i) => i.state === 'received')).toBe(true);
  });

  it('partial receive → status awaiting, un-received items become missing', () => {
    const batch = makeBatch();
    const result = closeCheckIn(batch, new Set(['g-001']));
    expect(result.status).toBe('awaiting');
    expect(result.items.find((i) => i.garmentId === 'g-001')?.state).toBe(
      'received',
    );
    expect(result.items.find((i) => i.garmentId === 'g-002')?.state).toBe(
      'missing',
    );
  });

  it('none received → all missing, status awaiting', () => {
    const batch = makeBatch();
    const result = closeCheckIn(batch, new Set());
    expect(result.status).toBe('awaiting');
    expect(result.items.every((i) => i.state === 'missing')).toBe(true);
  });

  it('does not change already-non-out items', () => {
    const batch = makeBatch({
      items: [
        { garmentId: 'g-001', state: 'received' },
        { garmentId: 'g-002', state: 'out' },
      ],
    });
    const result = closeCheckIn(batch, new Set(['g-002']));
    expect(result.items[0].state).toBe('received');
    expect(result.items[1].state).toBe('received');
    expect(result.status).toBe('closed');
  });
});

// ─── isBatchResolvable ────────────────────────────────────────────────────────

describe('isBatchResolvable', () => {
  it('true when all items are received', () => {
    expect(
      isBatchResolvable(
        makeBatch({
          items: [{ garmentId: 'g-001', state: 'received' }],
        }),
      ),
    ).toBe(true);
  });

  it('true when mix of received/found/lost', () => {
    expect(
      isBatchResolvable(
        makeBatch({
          items: [
            { garmentId: 'g-001', state: 'received' },
            { garmentId: 'g-002', state: 'found' },
            { garmentId: 'g-003', state: 'lost' },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('false when any item is out', () => {
    expect(isBatchResolvable(makeBatch())).toBe(false);
  });

  it('false when any item is missing', () => {
    expect(
      isBatchResolvable(
        makeBatch({
          items: [
            { garmentId: 'g-001', state: 'received' },
            { garmentId: 'g-002', state: 'missing' },
          ],
        }),
      ),
    ).toBe(false);
  });
});

// ─── computeSpendStats ────────────────────────────────────────────────────────

describe('computeSpendStats', () => {
  const jan = new Date(2025, 0, 15).getTime();
  const feb = new Date(2025, 1, 10).getTime();
  const mar = new Date(2025, 2, 5).getTime();

  const batches: Batch[] = [
    makeBatch({
      id: 'b-1',
      date: jan,
      amountINR: 200,
      status: 'closed',
      items: [
        { garmentId: 'g-1', state: 'received' },
        { garmentId: 'g-2', state: 'received' },
      ],
    }),
    makeBatch({
      id: 'b-2',
      date: feb,
      amountINR: 300,
      status: 'closed',
      items: [{ garmentId: 'g-3', state: 'received' }],
    }),
    makeBatch({
      id: 'b-3',
      date: mar,
      amountINR: 150,
      status: 'closed',
      items: [
        { garmentId: 'g-4', state: 'received' },
        { garmentId: 'g-5', state: 'received' },
        { garmentId: 'g-6', state: 'received' },
      ],
    }),
    makeBatch({
      id: 'b-4',
      date: mar,
      amountINR: 999,
      status: 'active',
      items: [],
    }), // excluded — not closed
  ];

  it('totalSpend sums only closed batches', () => {
    expect(computeSpendStats(batches).totalSpend).toBe(650);
  });

  it('dropCount counts closed batches only', () => {
    expect(computeSpendStats(batches).dropCount).toBe(3);
  });

  it('avgPerDrop is correct', () => {
    expect(computeSpendStats(batches).avgPerDrop).toBeCloseTo(650 / 3);
  });

  it('avgPerGarment is correct', () => {
    // 2 + 1 + 3 = 6 garments, 650 total
    expect(computeSpendStats(batches).avgPerGarment).toBeCloseTo(650 / 6);
  });

  it('monthlySpend groups by month correctly', () => {
    const stats = computeSpendStats(batches);
    expect(stats.monthlySpend).toHaveLength(3);
    expect(stats.monthlySpend[0]).toEqual({ year: 2025, month: 1, spend: 200 });
    expect(stats.monthlySpend[1]).toEqual({ year: 2025, month: 2, spend: 300 });
    expect(stats.monthlySpend[2]).toEqual({ year: 2025, month: 3, spend: 150 });
  });

  it('respects fromMs date filter', () => {
    const stats = computeSpendStats(batches, feb);
    expect(stats.totalSpend).toBe(450);
    expect(stats.dropCount).toBe(2);
  });

  it('respects toMs date filter', () => {
    const stats = computeSpendStats(batches, undefined, feb);
    expect(stats.totalSpend).toBe(500);
  });

  it('returns zero stats for empty batches', () => {
    const stats = computeSpendStats([]);
    expect(stats.totalSpend).toBe(0);
    expect(stats.dropCount).toBe(0);
    expect(stats.avgPerDrop).toBe(0);
    expect(stats.avgPerGarment).toBe(0);
    expect(stats.monthlySpend).toHaveLength(0);
  });
});

// ─── getMonthlySpendWindow ────────────────────────────────────────────────────

describe('getMonthlySpendWindow', () => {
  it('returns exactly N months', () => {
    expect(getMonthlySpendWindow([], 6)).toHaveLength(6);
    expect(getMonthlySpendWindow([], 3)).toHaveLength(3);
  });

  it('pads months with no spend as zero', () => {
    const window = getMonthlySpendWindow([], 6);
    expect(window.every((m) => m.spend === 0)).toBe(true);
  });

  it('fills in spend for matching months', () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).getTime();
    const batch = makeBatch({
      status: 'closed',
      date: thisMonth,
      amountINR: 500,
    });
    const window = getMonthlySpendWindow([batch], 3);
    const last = window[window.length - 1];
    expect(last.spend).toBe(500);
  });

  it('months are ordered oldest to newest', () => {
    const window = getMonthlySpendWindow([], 6);
    for (let i = 1; i < window.length; i++) {
      const prev = window[i - 1];
      const curr = window[i];
      const prevVal = prev.year * 12 + prev.month;
      const currVal = curr.year * 12 + curr.month;
      expect(currVal).toBeGreaterThan(prevVal);
    }
  });
});
