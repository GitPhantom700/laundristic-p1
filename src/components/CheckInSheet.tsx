import React, { useState, useEffect } from 'react';
import { getGarmentsByStatus, putBatch } from '../lib/storage';
import { closeCheckIn } from '../lib/domain';
import type { Batch, Garment } from '../lib/types';
import { useToast } from './ToastProvider';

interface CheckInSheetProps {
  batch: Batch;
  onClose: () => void;
  onComplete: () => void;
}

function CheckInItem({
  garment,
  isReceived,
  onToggle,
}: {
  garment: Garment;
  isReceived: boolean;
  onToggle: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(garment.photoBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [garment.photoBlob]);

  return (
    <div className="checkin-item" onClick={onToggle}>
      <div className={`checkin-checkbox ${isReceived ? 'checked' : ''}`} />
      <img src={url || ''} alt={garment.code} className="checkin-photo" />
      <div className="checkin-info">
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>
          {garment.code}
        </span>
        <span
          style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}
        >
          {garment.type}
        </span>
      </div>
    </div>
  );
}

export function CheckInSheet({
  batch,
  onClose,
  onComplete,
}: CheckInSheetProps) {
  const { showToast } = useToast();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [receivedIds, setReceivedIds] = useState<Set<string>>(new Set());
  const [outItemsCount, setOutItemsCount] = useState(0);

  useEffect(() => {
    async function load() {
      // 1. Get all out items for this batch
      const outIds = batch.items
        .filter((item) => item.state === 'out')
        .map((item) => item.garmentId);

      setOutItemsCount(outIds.length);

      // 2. Initialize all as received
      setReceivedIds(new Set(outIds));

      // 3. Fetch Garment details for display
      const allActive = await getGarmentsByStatus('active');
      const outGarments = allActive.filter((g) => outIds.includes(g.id));
      setGarments(outGarments);
    }
    load();
  }, [batch]);

  const handleToggle = (id: string) => {
    const next = new Set(receivedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setReceivedIds(next);
  };

  const handleComplete = async () => {
    try {
      const updatedBatch = closeCheckIn(batch, receivedIds);
      await putBatch(updatedBatch);

      const missingCount = outItemsCount - receivedIds.size;
      if (missingCount === 0) {
        showToast('All items received!', 'success');
      } else {
        showToast(`${missingCount} items marked as missing`, 'warning');
      }

      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to complete check-in', 'error');
    }
  };

  const missingCount = outItemsCount - receivedIds.size;
  const buttonText =
    missingCount === 0
      ? `Complete (All ${outItemsCount} items)`
      : `Complete (${missingCount} missing)`;

  return (
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
            Check In
          </h3>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {garments.map((g) => (
            <CheckInItem
              key={g.id}
              garment={g}
              isReceived={receivedIds.has(g.id)}
              onToggle={() => handleToggle(g.id)}
            />
          ))}
        </div>

        <button
          onClick={handleComplete}
          className="btn-primary"
          style={{ marginTop: '16px' }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
