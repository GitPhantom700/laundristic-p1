import React, { useState, useEffect } from 'react';
import { useCamera } from '../lib/useCamera';
import {
  getGarmentsByStatus,
  getBatchesByStatus,
  getSetting,
  setSetting,
  putBatch,
  getAllBatches,
} from '../lib/storage';
import { generateId } from '../lib/ids';
import type { Garment, Batch } from '../lib/types';
import { useToast } from './ToastProvider';

interface DropOffSheetProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select' | 'details' | 'receipt';

function SelectableGarment({
  garment,
  isSelected,
  isDisabled,
  onToggle,
}: {
  garment: Garment;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(garment.photoBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [garment.photoBlob]);

  const handleClick = () => {
    if (!isDisabled) {
      onToggle();
    }
  };

  const className = `selectable-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;

  return (
    <div className={className} onClick={handleClick}>
      <div className="selectable-photo-container">
        {url && (
          <img
            src={url}
            alt={garment.code}
            className="selectable-photo"
            loading="lazy"
          />
        )}
      </div>
      <div
        style={{
          textAlign: 'center',
          padding: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {garment.code}
      </div>
    </div>
  );
}

export function DropOffSheet({ onClose, onSuccess }: DropOffSheetProps) {
  const { showToast } = useToast();
  const {
    videoRef,
    fileInputRef,
    mode: cameraMode,
    busy,
    start,
    stop,
    capture,
    pickFile,
  } = useCamera();

  const [step, setStep] = useState<Step>('select');
  const [activeGarments, setActiveGarments] = useState<Garment[]>([]);
  const [outIds, setOutIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form details
  const [shopName, setShopName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dropDate, setDropDate] = useState(() =>
    new Date().toISOString().substring(0, 10),
  );

  useEffect(() => {
    async function init() {
      // Fetch garments
      const garments = await getGarmentsByStatus('active');
      garments.sort((a, b) => b.createdAt - a.createdAt);
      setActiveGarments(garments);

      // Compute outIds
      const activeBatches = await getBatchesByStatus('active');
      const awaitingBatches = await getBatchesByStatus('awaiting');
      const outSet = new Set<string>();
      [...activeBatches, ...awaitingBatches].forEach((b) => {
        b.items.forEach((i) => {
          if (i.state === 'out' || i.state === 'missing') {
            outSet.add(i.garmentId);
          }
        });
      });
      setOutIds(outSet);

      // Get all batches to find the last one for prefilling shop
      const allBatches = await getAllBatches();
      allBatches.sort((a, b) => b.date - a.date);
      const lastBatch = allBatches.length > 0 ? allBatches[0] : null;

      // Do NOT pre-select items from lastBatch. It causes invisible items to be included in new batches.
      setSelectedIds(new Set());

      // Prefill shop & amount
      const savedShop = await getSetting('lastShop');
      if (savedShop) {
        setShopName(savedShop);
      } else if (lastBatch) {
        setShopName(lastBatch.shopName);
      }

      if (lastBatch) {
        setAmountStr(lastBatch.amountINR.toString());
      }
    }
    init();
  }, []);

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleNextToDetails = () => {
    if (selectedIds.size === 0) {
      showToast('Select at least one item', 'error');
      return;
    }
    setStep('details');
  };

  const handleNextToReceipt = async () => {
    if (!shopName.trim()) {
      showToast('Shop name is required', 'error');
      return;
    }
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount < 0) {
      showToast('Valid amount is required', 'error');
      return;
    }
    setStep('receipt');
    try {
      await start();
    } catch (err) {
      showToast('Camera failed to start', 'error');
    }
  };

  // Safe close explicitly stops camera
  const handleClose = () => {
    stop();
    onClose();
  };

  const completeBatch = async (blob: Blob) => {
    try {
      const amount = parseInt(amountStr, 10);
      const batch: Batch = {
        id: generateId(),
        shopName: shopName.trim(),
        date: new Date(dropDate).getTime(),
        amountINR: amount,
        receiptBlob: blob,
        status: 'active',
        items: Array.from(selectedIds).map((id) => ({
          garmentId: id,
          state: 'out',
        })),
      };

      await putBatch(batch);
      await setSetting('lastShop', batch.shopName);

      showToast('Drop-off saved!', 'success');
      stop();
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast('Failed to save drop-off', 'error');
    }
  };

  const handleCapture = async () => {
    try {
      const blob = await capture();
      await completeBatch(blob);
    } catch (err) {
      showToast('Capture failed', 'error');
    }
  };

  const handlePickFile = async () => {
    try {
      const blob = await pickFile();
      await completeBatch(blob);
    } catch (err) {
      // silently ignore cancel
    }
  };

  return (
    <div className="edit-sheet-overlay" onClick={handleClose}>
      <div className="dropoff-sheet" onClick={(e) => e.stopPropagation()}>
        <div
          className="edit-sheet-header"
          style={{ justifyContent: 'flex-start', gap: '8px' }}
        >
          <button onClick={handleClose} className="nav-back-btn">
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
            {step === 'select' && 'Select Items'}
            {step === 'details' && 'Details'}
            {step === 'receipt' && 'Receipt Photo'}
          </h3>
        </div>

        {step === 'select' && (
          <>
            <div className="selectable-grid">
              {activeGarments.map((g) => (
                <SelectableGarment
                  key={g.id}
                  garment={g}
                  isSelected={selectedIds.has(g.id)}
                  isDisabled={outIds.has(g.id)}
                  onToggle={() => handleToggle(g.id)}
                />
              ))}
            </div>
            <button
              onClick={handleNextToDetails}
              className="btn-primary"
              disabled={selectedIds.size === 0}
            >
              Next ({selectedIds.size} selected)
            </button>
          </>
        )}

        {step === 'details' && (
          <>
            <div className="form-group">
              <label className="form-label">Shop Name</label>
              <input
                type="text"
                className="form-input"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Wash & Fold"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={dropDate}
                onChange={(e) => setDropDate(e.target.value)}
              />
            </div>
            <div className="edit-actions" style={{ flexDirection: 'row' }}>
              <button
                onClick={() => setStep('select')}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Back
              </button>
              <button
                onClick={handleNextToReceipt}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 'receipt' && (
          <>
            <div
              className="catalog-viewfinder"
              style={{
                borderRadius: '12px',
                flex: 'none',
                width: '100%',
                aspectRatio: '3/4',
                maxHeight: '60vh',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <video
                ref={videoRef}
                className="catalog-video"
                style={{ display: cameraMode === 'stream' ? 'block' : 'none' }}
              />
              {cameraMode === 'fallback' && (
                <div className="fallback-state">
                  <p>Camera not available.</p>
                  <button
                    onClick={handlePickFile}
                    className="btn-primary"
                    disabled={busy}
                  >
                    Choose Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
              )}
              {cameraMode === 'stream' && (
                <div className="catalog-controls" style={{ padding: '16px' }}>
                  <button
                    className="shutter-btn"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderWidth: '3px',
                    }}
                    onClick={handleCapture}
                    disabled={busy}
                    aria-label="Take photo"
                  />
                </div>
              )}
            </div>
            <button
              onClick={() => {
                stop();
                setStep('details');
              }}
              className="btn-secondary"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
