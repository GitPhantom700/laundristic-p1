import React, { useState, useEffect } from 'react';
import { getGarment } from '../lib/storage';
import type { Batch, Garment } from '../lib/types';

interface ProofScreenProps {
  batch: Batch;
  onClose: () => void;
}

function ProofItemCard({ garment }: { garment: Garment }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(garment.photoBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [garment.photoBlob]);

  return (
    <div className="proof-item-card">
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

export function ProofScreen({ batch, onClose }: ProofScreenProps) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const missingIds = batch.items
        .filter((i) => i.state === 'missing')
        .map((i) => i.garmentId);
      const loaded: Garment[] = [];
      for (const id of missingIds) {
        const g = await getGarment(id);
        if (g) loaded.push(g);
      }
      setGarments(loaded);
    }
    load();
  }, [batch]);

  useEffect(() => {
    if (!batch.receiptBlob) return;
    const url = URL.createObjectURL(batch.receiptBlob);
    setReceiptUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [batch.receiptBlob]);

  const missingItems = batch.items.filter((i) => i.state === 'missing');

  return (
    <div className="proof-screen">
      <div className="proof-header">
        <button
          onClick={onClose}
          className="proof-close-btn"
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
        <h3 className="proof-title">Proof</h3>
        <div style={{ width: 36 }} />
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
          {missingItems.length} item{missingItems.length !== 1 ? 's' : ''} not
          returned
        </div>

        {garments.map((g) => (
          <ProofItemCard key={g.id} garment={g} />
        ))}
      </div>
    </div>
  );
}
