import React, { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../lib';
import { useToast } from '../components';

export function Settings() {
  const { showToast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laundristic-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importBackup(file);
      showToast(
        `Restored ${result.garments} garment${result.garments !== 1 ? 's' : ''} and ${result.batches} batch${result.batches !== 1 ? 'es' : ''}`,
        'success',
      );
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1>Settings</h1>
      </div>

      <section className="settings-section">
        <h2 className="settings-section-title">Data Backup</h2>
        <div className="batch-card">
          <p className="settings-description">
            Save all your garments and drop-off history as a ZIP file. Import it
            on any device to restore your data.
          </p>
          <div className="settings-actions">
            <button
              className="btn-primary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting…' : 'Export Backup'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Importing…' : 'Import Backup'}
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      </section>

      <div
        style={{
          textAlign: 'center',
          marginTop: '32px',
          marginBottom: '32px',
          color: '#999',
          fontSize: '12px',
        }}
      >
        Laundristic v0.1.3
      </div>
    </div>
  );
}
