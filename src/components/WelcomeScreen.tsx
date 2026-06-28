import React, { useRef, useState } from 'react';
import { setSetting, importBackup } from '../lib';
import { useToast } from './ToastProvider';

interface WelcomeScreenProps {
  /** Called once the user has either started fresh or restored a backup. */
  onDone: () => void;
}

/**
 * First-run welcome screen (Concept D — editorial).
 *
 * Shown until the `onboarded` flag is set in IndexedDB. The hero band art is
 * pure CSS/SVG (no image asset) so the screen renders instantly and offline,
 * in keeping with the app's local-first ethos.
 */
export function WelcomeScreen({ onDone }: WelcomeScreenProps) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleStart() {
    await setSetting('onboarded', 1);
    onDone();
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importBackup(file);
      await setSetting('onboarded', 1);
      showToast(
        `Restored ${result.garments} garment${result.garments !== 1 ? 's' : ''} and ${result.batches} batch${result.batches !== 1 ? 'es' : ''}`,
        'success',
      );
      onDone();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="welcome">
      <div className="welcome-band">
        <div className="welcome-receipt" aria-hidden="true" />

        <div
          className="welcome-garment welcome-garment--cream"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="welcomeCream" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f3eee2" />
                <stop offset="1" stopColor="#dbe3d7" />
              </linearGradient>
            </defs>
            <path
              d="M66 26 C74 40 86 46 100 46 C114 46 126 40 134 26 L180 54 L162 96 L146 86 L146 176 C146 184 140 190 132 190 L68 190 C60 190 54 184 54 176 L54 86 L38 96 L20 54 Z"
              fill="url(#welcomeCream)"
            />
            <path
              d="M71 31 C79 44 89 50 100 50 C111 50 121 44 129 31"
              stroke="rgba(60,55,45,.10)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div
          className="welcome-garment welcome-garment--sage"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="welcomeSage" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d3e1d2" />
                <stop offset="1" stopColor="#9bb79e" />
              </linearGradient>
            </defs>
            <path
              d="M66 26 C74 40 86 46 100 46 C114 46 126 40 134 26 L180 54 L162 96 L146 86 L146 176 C146 184 140 190 132 190 L68 190 C60 190 54 184 54 176 L54 86 L38 96 L20 54 Z"
              fill="url(#welcomeSage)"
            />
            <path
              d="M71 31 C79 44 89 50 100 50 C111 50 121 44 129 31"
              stroke="rgba(40,50,40,.12)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="welcome-wordmark">
          <div className="welcome-name">Laundristic</div>
          <div className="welcome-tagline">Never lose a garment again.</div>
        </div>
      </div>

      <div className="welcome-body">
        <p className="welcome-lede">
          Catalog your clothes, track what you drop at the laundry, and{' '}
          <strong>keep proof of every pickup</strong>.
        </p>

        <button className="btn-primary welcome-cta" onClick={handleStart}>
          Get started
        </button>
        <button
          className="welcome-restore"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Restoring…' : 'Restore from a backup'}
        </button>

        <p className="welcome-foot">
          No account needed · Works offline · Private by design
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={handleRestoreFile}
        />
      </div>
    </div>
  );
}
