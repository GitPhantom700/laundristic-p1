import React, { useState } from 'react';
import { useInstallPrompt } from '../lib';

export const InstallPrompt: React.FC = () => {
  const { isIos, isStandalone, installed, canInstall, promptInstall } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  // Already installed, dismissed, or nothing actionable to offer (e.g. a
  // desktop browser with no native prompt and not iOS).
  if (isStandalone || installed || dismissed) return null;
  if (!canInstall && !isIos) return null;

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === 'accepted') setDismissed(true);
  }

  return (
    <div
      className="install-prompt"
      role="dialog"
      aria-label="Install Laundristic"
    >
      <div className="install-prompt-head">
        <h4 className="install-prompt-title">Install Laundristic</h4>
        <button
          className="install-prompt-close"
          onClick={() => setDismissed(true)}
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
      </div>

      {canInstall ? (
        <>
          <p className="install-prompt-text">
            Add Laundristic to your device for offline access and a full-screen
            app.
          </p>
          <button className="install-prompt-cta" onClick={handleInstall}>
            Install app
          </button>
        </>
      ) : (
        <p className="install-prompt-text">
          Tap the <strong>Share</strong> button at the bottom of Safari, then
          tap <strong>Add to Home Screen</strong> for offline access.
        </p>
      )}
    </div>
  );
};
