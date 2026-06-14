import React, { useState, useEffect } from 'react';
import { Catalog } from './Catalog';
import { EditGarmentSheet } from '../components/EditGarmentSheet';
import {
  getAllGarments,
  getGarmentsByStatus,
  getBatchesByStatus,
} from '../lib/storage';
import type { Garment } from '../lib/types';

function GarmentCard({
  garment,
  isOut,
  onClick,
}: {
  garment: Garment;
  isOut: boolean;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(garment.photoBlob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [garment.photoBlob]);

  return (
    <div className="garment-card" onClick={onClick}>
      <div className="garment-photo-container">
        {url && (
          <img
            src={url}
            alt={garment.code}
            className="garment-photo"
            loading="lazy"
          />
        )}
        {isOut && <div className="garment-status-chip">AT LAUNDRY</div>}
      </div>
      <div className="garment-info">
        <span className="garment-code">{garment.code}</span>
        <span className="garment-cat">{garment.type}</span>
      </div>
    </div>
  );
}

export function Wardrobe() {
  const [isCataloging, setIsCataloging] = useState(false);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const [outIds, setOutIds] = useState<Set<string>>(new Set());
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);

  const loadData = async () => {
    // 1. Fetch active garments for the grid
    const active = await getGarmentsByStatus('active');

    // Sort newly added first (optional but nice)
    active.sort((a, b) => b.createdAt - a.createdAt);
    setGarments(active);

    // 2. Fetch all garments to get every used code (even removed/lost ones)
    const all = await getAllGarments();
    setExistingCodes(all.map((g) => g.code));

    // 3. Compute "AT LAUNDRY" ids
    const activeBatches = await getBatchesByStatus('active');
    const awaitingBatches = await getBatchesByStatus('awaiting');
    const batches = [...activeBatches, ...awaitingBatches];

    const outSet = new Set<string>();
    batches.forEach((b) => {
      b.items.forEach((item) => {
        if (item.state === 'out' || item.state === 'missing') {
          outSet.add(item.garmentId);
        }
      });
    });
    setOutIds(outSet);
  };

  useEffect(() => {
    if (!isCataloging && !editingGarment) {
      loadData();
    }
  }, [isCataloging, editingGarment]);

  if (isCataloging) {
    return <Catalog onClose={() => setIsCataloging(false)} />;
  }

  return (
    <div className="screen-container">
      <header className="screen-header">
        <h1>Wardrobe</h1>
      </header>

      {garments.length === 0 ? (
        <div className="screen-empty-state">
          <div className="empty-icon">
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h2 className="empty-title">Your Wardrobe is empty</h2>
          <p className="empty-subtitle">
            Catalog your garments to keep track of what's at the laundry.
          </p>
          <button onClick={() => setIsCataloging(true)} className="btn-primary">
            Catalog item
          </button>
        </div>
      ) : (
        <>
          <div className="wardrobe-grid">
            {garments.map((g) => (
              <GarmentCard
                key={g.id}
                garment={g}
                isOut={outIds.has(g.id)}
                onClick={() => setEditingGarment(g)}
              />
            ))}
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={() => setIsCataloging(true)}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              Catalog more items
            </button>
          </div>
        </>
      )}

      {editingGarment && (
        <EditGarmentSheet
          garment={editingGarment}
          existingCodes={existingCodes}
          onClose={() => setEditingGarment(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
