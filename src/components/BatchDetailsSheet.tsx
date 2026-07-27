import React, { useState, useEffect } from 'react';
import { useObjectUrl } from '../lib/useObjectUrl';
import { getGarment, deleteBatch } from '../lib/storage';
import type { Batch, Garment } from '../lib/types';

interface BatchDetailsSheetProps {
  batch: Batch;
  onClose: () => void;
  onDelete?: () => void;
}

function DetailItemCard({
  garment,
  state,
  onExpand,
}: {
  garment: Garment;
  state: string;
  onExpand?: (url: string) => void;
}) {
  const url = useObjectUrl(garment.photoBlob);

  return (
    <div
      className="proof-item-card"
      onClick={() => onExpand && url && onExpand(url)}
      style={{ cursor: onExpand ? 'pointer' : 'default' }}
    >
      {url && (
        <img
          src={url}
          alt={garment.code}
          className="proof-item-photo"
          loading="lazy"
        />
      )}
      <div className="proof-item-info">
        <span className="proof-item-code">{garment.code}</span>
        <span className="proof-item-type">{garment.type}</span>
      </div>
      <div
        className={`batch-status-chip ${
          state === 'missing' || state === 'lost' ? 'awaiting' : 'closed'
        }`}
      >
        {state}
      </div>
    </div>
  );
}

export function BatchDetailsSheet({
  batch,
  onClose,
  onDelete,
}: BatchDetailsSheetProps) {
  const [garments, setGarments] = useState<
    Array<{ garment: Garment; state: string }>
  >([]);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const loaded: Array<{ garment: Garment; state: string }> = [];
      for (const item of batch.items) {
        const g = await getGarment(item.garmentId);
        if (g) {
          loaded.push({ garment: g, state: item.state });
        }
      }
      setGarments(loaded);
    }
    load();
  }, [batch]);

  return (
    <div className="edit-sheet-overlay" onClick={onClose}>
      <div
        className="dropoff-sheet"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="edit-sheet-header"
          style={{ justifyContent: 'flex-start', gap: '8px', padding: '16px' }}
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
            Back
          </button>
          <h3
            className="edit-sheet-title"
            style={{ flex: 1, textAlign: 'center' }}
          >
            Batch Details
          </h3>
          <button
            onClick={async () => {
              if (window.confirm('Delete this batch? This cannot be undone.')) {
                await deleteBatch(batch.id);
                if (onDelete) onDelete();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-error)',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px',
            }}
            aria-label="Delete Batch"
          >
            Delete
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>{batch.shopName}</h4>
            <div style={{ color: 'var(--color-text-muted)' }}>
              {new Date(batch.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div style={{ fontWeight: 600, marginTop: '4px' }}>
              ₹{batch.amountINR}
            </div>
          </div>

          <h4 style={{ marginBottom: '12px' }}>Items ({garments.length})</h4>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {garments.map(({ garment, state }) => (
              <DetailItemCard
                key={garment.id}
                garment={garment}
                state={state}
                onExpand={(url) => setExpandedPhoto(url)}
              />
            ))}
          </div>
        </div>
      </div>

      {expandedPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            cursor: 'zoom-out',
          }}
          onClick={() => setExpandedPhoto(null)}
        >
          <div
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
              right: '16px',
              zIndex: 1001,
            }}
          >
            <button
              className="overlay-close-btn"
              aria-label="Close photo"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedPhoto(null);
              }}
            >
              <span
                style={{
                  fontSize: '32px',
                  lineHeight: 1,
                  paddingBottom: '4px',
                }}
              >
                &times;
              </span>
            </button>
          </div>
          <img
            src={expandedPhoto}
            alt="Expanded view"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
