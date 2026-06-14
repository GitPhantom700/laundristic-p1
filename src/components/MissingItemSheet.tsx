import React, { useState, useEffect } from 'react';
import { getGarment, putGarment, putBatch } from '../lib/storage';
import {
  transitionBatchItem,
  isBatchResolvable,
  transitionBatch,
} from '../lib/domain';
import type { Batch, Garment } from '../lib/types';
import { useToast } from './ToastProvider';
import { ProofScreen } from './ProofScreen';

interface MissingItemSheetProps {
  batch: Batch;
  onClose: () => void;
  onComplete: () => void;
}

function MissingGarmentRow({
  garment,
  onFound,
  onLost,
  disabled,
}: {
  garment: Garment;
  onFound: () => void;
  onLost: () => void;
  disabled: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(garment.photoBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [garment.photoBlob]);

  return (
    <div className="missing-item-row">
      <img src={url || ''} alt={garment.code} className="checkin-photo" />
      <div className="checkin-info">
        <span style={{ fontWeight: 600 }}>{garment.code}</span>
        <span
          style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}
        >
          {garment.type}
        </span>
      </div>
      <div className="resolution-btns">
        <button
          className="btn-resolve-found"
          onClick={onFound}
          disabled={disabled}
        >
          Found
        </button>
        <button
          className="btn-resolve-lost"
          onClick={onLost}
          disabled={disabled}
        >
          Lost
        </button>
      </div>
    </div>
  );
}

export function MissingItemSheet({
  batch,
  onClose,
  onComplete,
}: MissingItemSheetProps) {
  const { showToast } = useToast();
  const [localBatch, setLocalBatch] = useState<Batch>(batch);
  const [garments, setGarments] = useState<Map<string, Garment>>(new Map());
  const [resolving, setResolving] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);

  useEffect(() => {
    async function loadGarments() {
      const missingIds = batch.items
        .filter((i) => i.state === 'missing')
        .map((i) => i.garmentId);
      const map = new Map<string, Garment>();
      for (const id of missingIds) {
        const g = await getGarment(id);
        if (g) map.set(id, g);
      }
      setGarments(map);
    }
    loadGarments();
  }, [batch]);

  const missingItems = localBatch.items.filter((i) => i.state === 'missing');

  const handleResolve = async (
    garmentId: string,
    resolution: 'found' | 'lost',
  ) => {
    if (resolving) return;
    setResolving(true);
    try {
      const updated = transitionBatchItem(localBatch, garmentId, resolution);

      if (resolution === 'lost') {
        const garment = garments.get(garmentId);
        if (garment) {
          await putGarment({ ...garment, status: 'lost' });
        }
      }

      if (isBatchResolvable(updated)) {
        const closed = transitionBatch(updated, 'closed');
        await putBatch(closed);
        showToast('All items resolved. Batch closed.', 'success');
        onComplete();
      } else {
        await putBatch(updated);
        setLocalBatch(updated);
        showToast(
          resolution === 'found'
            ? 'Item marked as found'
            : 'Item marked as lost',
          'info',
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update item', 'error');
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <div className="edit-sheet-overlay" onClick={onClose}>
        <div
          className="dropoff-sheet"
          style={{ maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="edit-sheet-header"
            style={{ justifyContent: 'flex-start', gap: '8px' }}
          >
            <button onClick={onClose} className="nav-back-btn">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Cancel
            </button>
            <h3
              className="edit-sheet-title"
              style={{ flex: 1, textAlign: 'center', marginRight: '80px' }}
            >
              Resolve Items
            </h3>
          </div>

          <button
            onClick={() => setProofOpen(true)}
            className="btn-secondary"
            style={{ width: '100%' }}
          >
            View Proof
          </button>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {missingItems.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  padding: '24px 0',
                }}
              >
                All items resolved.
              </p>
            ) : (
              missingItems.map((item) => {
                const g = garments.get(item.garmentId);
                if (!g) return null;
                return (
                  <MissingGarmentRow
                    key={item.garmentId}
                    garment={g}
                    onFound={() => handleResolve(item.garmentId, 'found')}
                    onLost={() => handleResolve(item.garmentId, 'lost')}
                    disabled={resolving}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {proofOpen && (
        <ProofScreen batch={localBatch} onClose={() => setProofOpen(false)} />
      )}
    </>
  );
}
