import React, { useState, useEffect } from 'react';
import { getGarment, deleteBatch } from '../lib/storage';
import type { Batch, Garment } from '../lib/types';

interface ProofScreenProps {
  batch: Batch;
  onClose: () => void;
  onDelete?: () => void;
}

function ProofItemCard({
  garment,
  onExpand,
}: {
  garment: Garment;
  onExpand?: (url: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(garment.photoBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [garment.photoBlob]);

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
    </div>
  );
}

export function ProofScreen({ batch, onClose, onDelete }: ProofScreenProps) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const isClosed = batch.status === 'closed';

  useEffect(() => {
    async function load() {
      const itemIds = batch.items
        .filter((i) => isClosed || i.state === 'missing')
        .map((i) => i.garmentId);
      const loaded: Garment[] = [];
      for (const id of itemIds) {
        const g = await getGarment(id);
        if (g) loaded.push(g);
      }
      setGarments(loaded);
    }
    load();
  }, [batch, isClosed]);

  useEffect(() => {
    if (!batch.receiptBlob) return;
    const url = URL.createObjectURL(batch.receiptBlob);
    setReceiptUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [batch.receiptBlob]);

  const targetItems = batch.items.filter(
    (i) => isClosed || i.state === 'missing',
  );

  return (
    <div className="proof-screen">
      <div className="proof-header">
        <button
          onClick={onClose}
          className="proof-close-btn no-print"
          aria-label="Close"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3 className="proof-title">{isClosed ? 'Receipt' : 'Proof'}</h3>
        <button
          onClick={() => window.print()}
          className="btn-primary no-print"
          style={{ padding: '6px 12px', fontSize: '0.875rem' }}
        >
          Share / Print
        </button>
      </div>

      <div className="proof-content">
        <div className="proof-batch-info">
          <div className="proof-shop">{batch.shopName}</div>
          <div className="proof-date">
            {new Date(batch.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <div className="proof-amount">₹{batch.amountINR}</div>
        </div>

        {receiptUrl && (
          <img
            src={receiptUrl}
            alt="Receipt"
            className="proof-receipt"
            loading="lazy"
          />
        )}

        <div className="proof-items-label">
          {targetItems.length} item{targetItems.length !== 1 ? 's' : ''}{' '}
          {isClosed ? 'total' : 'not returned'}
        </div>
        {garments.map((g) => (
          <ProofItemCard
            key={g.id}
            garment={g}
            onExpand={(url) => setExpandedPhoto(url)}
          />
        ))}

        {isClosed && (
          <button
            onClick={async () => {
              if (window.confirm('Delete this batch? This cannot be undone.')) {
                await deleteBatch(batch.id);
                if (onDelete) onDelete();
              }
            }}
            className="no-print"
            style={{
              width: '70%',
              margin: '32px auto 0',
              backgroundColor: 'var(--color-paper)',
              border: '2px solid var(--color-green)',
              color: 'var(--color-green)',
              fontWeight: 600,
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
            }}
          >
            Delete Receipt
          </button>
        )}
      </div>

      {expandedPhoto && (
        <div
          className="no-print"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
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
