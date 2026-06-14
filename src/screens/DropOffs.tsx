import React, { useState, useEffect } from 'react';
import { getAllBatches } from '../lib/storage';
import type { Batch } from '../lib/types';
import { DropOffSheet } from '../components/DropOffSheet';
import { CheckInSheet } from '../components/CheckInSheet';
import { MissingItemSheet } from '../components/MissingItemSheet';
import { ProofScreen } from '../components/ProofScreen';
import { BatchDetailsSheet } from '../components/BatchDetailsSheet';

function BatchCard({
  batch,
  onClick,
  onCheckIn,
  onResolve,
  onProof,
}: {
  batch: Batch;
  onClick?: () => void;
  onCheckIn?: () => void;
  onResolve?: () => void;
  onProof?: () => void;
}) {
  return (
    <div
      className={`batch-card ${batch.status}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="batch-header">
        <div>
          <div className="batch-shop">{batch.shopName}</div>
          <div className="batch-date">
            {new Date(batch.date).toLocaleDateString()}
          </div>
        </div>
        <div className={`batch-status-chip ${batch.status}`}>
          {batch.status}
        </div>
      </div>
      <div className="batch-meta">
        <span>{batch.items.length} items</span>
        <span style={{ fontWeight: 600 }}>₹{batch.amountINR}</span>
      </div>
      {onCheckIn && (
        <button
          onClick={onCheckIn}
          className="btn-secondary"
          style={{ marginTop: '8px' }}
        >
          Check In
        </button>
      )}
      {(onResolve || onProof) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {onProof && (
            <button
              onClick={onProof}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Proof
            </button>
          )}
          {onResolve && (
            <button
              onClick={onResolve}
              className="btn-primary"
              style={{ flex: 2 }}
            >
              Resolve
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DropOffs() {
  const [isDroppingOff, setIsDroppingOff] = useState(false);
  const [checkingInBatch, setCheckingInBatch] = useState<Batch | null>(null);
  const [resolvingBatch, setResolvingBatch] = useState<Batch | null>(null);
  const [proofBatch, setProofBatch] = useState<Batch | null>(null);
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);

  const [activeBatches, setActiveBatches] = useState<Batch[]>([]);
  const [awaitingBatches, setAwaitingBatches] = useState<Batch[]>([]);
  const [closedBatches, setClosedBatches] = useState<Batch[]>([]);

  const loadBatches = async () => {
    const all = await getAllBatches();
    // Sort descending by date
    all.sort((a, b) => b.date - a.date);

    setActiveBatches(all.filter((b) => b.status === 'active'));
    setAwaitingBatches(all.filter((b) => b.status === 'awaiting'));
    setClosedBatches(all.filter((b) => b.status === 'closed'));
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleDropOffSuccess = () => {
    setIsDroppingOff(false);
    loadBatches();
  };

  const handleCheckInComplete = () => {
    setCheckingInBatch(null);
    loadBatches();
  };

  const handleResolveClose = () => {
    setResolvingBatch(null);
    loadBatches();
  };

  const hasBatches =
    activeBatches.length > 0 ||
    awaitingBatches.length > 0 ||
    closedBatches.length > 0;

  return (
    <div className="screen-container">
      <header className="screen-header">
        <h1>Drop-offs</h1>
      </header>

      {!hasBatches ? (
        <div className="screen-empty-state">
          <div className="empty-icon">
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h2 className="empty-title">No active drop-offs</h2>
          <p className="empty-subtitle">
            Create a drop-off batch when you leave your clothes at the laundry.
          </p>
          <button
            onClick={() => setIsDroppingOff(true)}
            className="btn-primary"
          >
            New Drop-off
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '0 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {activeBatches.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>
                Active
              </h2>
              {activeBatches.map((b) => (
                <BatchCard
                  key={b.id}
                  batch={b}
                  onCheckIn={() => setCheckingInBatch(b)}
                />
              ))}
            </section>
          )}

          {awaitingBatches.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>
                Awaiting Items
              </h2>
              {awaitingBatches.map((b) => (
                <BatchCard
                  key={b.id}
                  batch={b}
                  onResolve={() => setResolvingBatch(b)}
                  onProof={() => setProofBatch(b)}
                />
              ))}
            </section>
          )}

          {closedBatches.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>
                History
              </h2>
              {closedBatches.map((b) => (
                <BatchCard
                  key={b.id}
                  batch={b}
                  onClick={() => setViewingBatch(b)}
                />
              ))}
            </section>
          )}

          <button
            onClick={() => setIsDroppingOff(true)}
            className="btn-primary"
          >
            New Drop-off
          </button>
        </div>
      )}

      {isDroppingOff && (
        <DropOffSheet
          onClose={() => setIsDroppingOff(false)}
          onSuccess={handleDropOffSuccess}
        />
      )}

      {checkingInBatch && (
        <CheckInSheet
          batch={checkingInBatch}
          onClose={() => setCheckingInBatch(null)}
          onComplete={handleCheckInComplete}
        />
      )}

      {resolvingBatch && (
        <MissingItemSheet
          batch={resolvingBatch}
          onClose={handleResolveClose}
          onComplete={handleResolveClose}
        />
      )}

      {proofBatch && (
        <ProofScreen batch={proofBatch} onClose={() => setProofBatch(null)} />
      )}

      {viewingBatch && (
        <BatchDetailsSheet
          batch={viewingBatch}
          onClose={() => setViewingBatch(null)}
        />
      )}
    </div>
  );
}
