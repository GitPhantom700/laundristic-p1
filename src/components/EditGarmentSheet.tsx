import React, { useState, useEffect } from 'react';
import { useObjectUrl } from '../lib/useObjectUrl';
import type { Garment } from '../lib/types';
import { putGarment } from '../lib/storage';
import { useCamera } from '../lib/useCamera';

interface EditGarmentSheetProps {
  garment: Garment;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditGarmentSheet({
  garment,
  onClose,
  onUpdate,
}: EditGarmentSheetProps) {
  const [mode, setMode] = useState<'view' | 'camera'>('view');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const previewUrl = useObjectUrl(garment.photoBlob);

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

  // Start camera if we switch to camera mode
  useEffect(() => {
    if (mode === 'camera') {
      start().catch(console.error);
    } else {
      stop();
    }
  }, [mode, start, stop]);

  // Make sure to stop camera on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  const handleCapture = async () => {
    try {
      const newBlob = await capture();
      await putGarment({ ...garment, photoBlob: newBlob });
      onUpdate();
      setMode('view');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickFile = async () => {
    try {
      const newBlob = await pickFile();
      await putGarment({ ...garment, photoBlob: newBlob });
      onUpdate();
      setMode('view');
    } catch (err) {
      // Ignored
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    await putGarment({ ...garment, status: 'removed' });
    onUpdate();
    onClose();
  };

  return (
    <div className="edit-sheet-overlay" onClick={onClose}>
      <div className="edit-sheet" onClick={(e) => e.stopPropagation()}>
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
            style={{
              flex: 1,
              textAlign: 'center',
              marginRight: '80px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Edit {garment.code}
          </h3>
        </div>

        {mode === 'view' && (
          <>
            {previewUrl && (
              <img
                src={previewUrl}
                alt={garment.code}
                className="edit-preview"
                loading="lazy"
              />
            )}
            <div className="edit-actions">
              <button
                onClick={() => setMode('camera')}
                className="btn-secondary"
              >
                Retake Photo
              </button>
              <button onClick={handleRemove} className="btn-danger">
                {confirmRemove ? 'Tap again to confirm delete' : 'Remove item'}
              </button>
            </div>
          </>
        )}

        {mode === 'camera' && (
          <div
            className="catalog-viewfinder"
            style={{
              borderRadius: '12px',
              height: '300px',
              marginBottom: '16px',
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
                  style={{ width: '56px', height: '56px', borderWidth: '3px' }}
                  onClick={handleCapture}
                  disabled={busy}
                  aria-label="Take photo"
                />
              </div>
            )}
          </div>
        )}
        {mode === 'camera' && (
          <button onClick={() => setMode('view')} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
