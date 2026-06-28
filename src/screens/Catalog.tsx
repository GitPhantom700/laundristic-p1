import React, { useState, useEffect } from 'react';
import { useCamera } from '../lib/useCamera';
import { getAllGarments, putGarment } from '../lib/storage';
import { generateId, generateCode } from '../lib/ids';
import type { GarmentCategory } from '../lib/types';
import { useToast } from '../components/ToastProvider';

// Garments are no longer manually categorized — every item uses the catch-all
// "ITM" type, so cataloging is just: snap a photo, then save.
const DEFAULT_CATEGORY: GarmentCategory = 'ITM';

type Step = 'viewfinder' | 'confirm';

interface CatalogProps {
  onClose: () => void;
}

export function Catalog({ onClose }: CatalogProps) {
  const { showToast } = useToast();
  const { videoRef, fileInputRef, mode, busy, start, stop, capture, pickFile } =
    useCamera();

  const [step, setStep] = useState<Step>('viewfinder');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const [runningCount, setRunningCount] = useState(0);
  const [existingCodes, setExistingCodes] = useState<string[]>([]);

  // 1. Load existing codes on mount
  useEffect(() => {
    async function loadCodes() {
      const garments = await getAllGarments();
      setExistingCodes(garments.map((g) => g.code));
    }
    loadCodes();
  }, []);

  // 2. Start camera when entering viewfinder
  useEffect(() => {
    if (step === 'viewfinder') {
      start().catch((err) => {
        showToast('Camera failed to start', 'error');
        console.error(err);
      });
    }
  }, [step, start, showToast]);

  // Cleanup Object URL safely
  const clearPreviewUrl = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // 3. Handle explicit close
  const handleClose = () => {
    clearPreviewUrl();
    stop(); // Explicitly call stop() before unmount
    onClose();
  };

  // After a photo is taken, assign the next code and go straight to confirm.
  const handleCapture = async () => {
    try {
      const blob = await capture();
      stop(); // Immediately release the camera hardware
      setPhotoBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setGeneratedCode(generateCode(DEFAULT_CATEGORY, existingCodes));
      setStep('confirm');
    } catch (error) {
      showToast('Capture failed', 'error');
      console.error(error);
    }
  };

  const handlePickFile = async () => {
    try {
      const blob = await pickFile();
      setPhotoBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setGeneratedCode(generateCode(DEFAULT_CATEGORY, existingCodes));
      setStep('confirm');
    } catch (error) {
      // User might have cancelled file picker, ignore silently unless it's a real error
    }
  };

  const handleRetake = () => {
    clearPreviewUrl();
    setPhotoBlob(null);
    setGeneratedCode(null);
    setStep('viewfinder');
  };

  const handleSaveAndNext = async () => {
    if (!photoBlob || !generatedCode) return;

    try {
      await putGarment({
        id: generateId(),
        code: generatedCode,
        type: DEFAULT_CATEGORY,
        photoBlob,
        status: 'active',
        createdAt: Date.now(),
      });

      // Update local state for next iteration
      setExistingCodes((prev) => [...prev, generatedCode]);
      setRunningCount((prev) => prev + 1);

      // Reset for next shot
      handleRetake();
    } catch (err) {
      showToast('Failed to save garment', 'error');
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!photoBlob || !generatedCode) return;

    try {
      await putGarment({
        id: generateId(),
        code: generatedCode,
        type: DEFAULT_CATEGORY,
        photoBlob,
        status: 'active',
        createdAt: Date.now(),
      });

      handleClose();
    } catch (err) {
      showToast('Failed to save garment', 'error');
      console.error(err);
    }
  };

  return (
    <div className="catalog-overlay">
      <div className="catalog-header">
        <button
          onClick={handleClose}
          className="catalog-close"
          aria-label="Close"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: '20px',
              height: '20px',
              minWidth: '20px',
              flexShrink: 0,
              display: 'block',
            }}
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        {runningCount > 0 && (
          <div className="catalog-badge">
            {runningCount} item{runningCount !== 1 ? 's' : ''} saved
          </div>
        )}
      </div>

      <div className="catalog-viewfinder">
        {step === 'viewfinder' ? (
          <>
            <video
              ref={videoRef}
              className="catalog-video"
              style={{ display: mode === 'stream' ? 'block' : 'none' }}
            />
            {mode === 'fallback' && (
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
          </>
        ) : (
          previewUrl && (
            <img
              src={previewUrl}
              alt="Captured"
              className="catalog-photo-preview"
            />
          )
        )}
      </div>

      {step === 'viewfinder' && mode === 'stream' && (
        <div className="catalog-controls">
          <button
            className="shutter-btn"
            onClick={handleCapture}
            disabled={busy}
            aria-label="Take photo"
          />
        </div>
      )}

      {step === 'confirm' && (
        <div className="confirm-pill">
          <div className="confirm-code">{generatedCode}</div>
          <div className="confirm-actions">
            <button onClick={handleSaveAndNext} className="btn-primary">
              Save & Next
            </button>
            <button onClick={handleSave} className="btn-primary">
              Save
            </button>
            <button onClick={handleRetake} className="btn-secondary">
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
