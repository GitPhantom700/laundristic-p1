import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { clearDb } from '../src/lib/db';
import { getAllGarments, getGarment } from '../src/lib/storage';
import type { Garment } from '../src/lib/types';
import { ToastProvider } from '../src/components/ToastProvider';
import { Catalog } from '../src/screens/Catalog';
import { EditGarmentSheet } from '../src/components/EditGarmentSheet';

// jsdom has no Object URL APIs; stub them for components that build previews.
beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
});

// Stub the camera hook so capture() yields a deterministic photo blob and no
// real getUserMedia is needed. A single shared object keeps hook identities
// stable across renders.
vi.mock('../src/lib/useCamera', () => {
  const cam = {
    videoRef: { current: null },
    fileInputRef: { current: null },
    mode: 'stream',
    busy: false,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    capture: vi
      .fn()
      .mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' })),
    pickFile: vi
      .fn()
      .mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' })),
  };
  return { useCamera: () => cam };
});

function makeGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'g-001',
    code: 'ITM-05',
    type: 'ITM',
    photoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    status: 'active',
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(async () => {
  await clearDb();
});

describe('Catalog — category step removed', () => {
  it('snap → save stores an ITM garment with no category prompt', async () => {
    const onClose = vi.fn();
    render(
      <ToastProvider>
        <Catalog onClose={onClose} />
      </ToastProvider>,
    );

    // Take a photo.
    fireEvent.click(await screen.findByLabelText('Take photo'));

    // Goes straight to confirm with an auto ITM code — no category sheet at all.
    expect(await screen.findByText('ITM-01')).toBeInTheDocument();
    expect(screen.queryByText(/select category/i)).not.toBeInTheDocument();
    expect(screen.queryByText('SHT')).not.toBeInTheDocument();

    // Save it.
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const garments = await getAllGarments();
    expect(garments).toHaveLength(1);
    expect(garments[0].type).toBe('ITM');
    expect(garments[0].code).toBe('ITM-01');
  });
});

describe('EditGarmentSheet — no category re-tagging', () => {
  it('offers retake/remove only, not category re-tagging', () => {
    render(
      <EditGarmentSheet
        garment={makeGarment()}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.queryByText(/re-tag category/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/select new category/i)).not.toBeInTheDocument();
    expect(screen.getByText('Retake Photo')).toBeInTheDocument();
    expect(screen.getByText('Remove item')).toBeInTheDocument();
  });

  it('remove uses a 2-tap confirm and soft-deletes the garment', async () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    const garment = makeGarment({ id: 'g-rm', code: 'ITM-09' });
    render(
      <EditGarmentSheet
        garment={garment}
        onClose={onClose}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByText('Remove item'));
    expect(screen.getByText(/tap again to confirm/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/tap again to confirm/i));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onUpdate).toHaveBeenCalled();
    const stored = await getGarment('g-rm');
    expect(stored?.status).toBe('removed');
  });
});
