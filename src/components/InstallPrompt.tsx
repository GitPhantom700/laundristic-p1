import React, { useState, useEffect } from 'react';

export const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Detect standalone
    const isInStandaloneMode = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = window.navigator as any;
      return 'standalone' in nav && nav.standalone;
    };

    if (isIos() && !isInStandaloneMode()) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        right: '16px',
        backgroundColor: 'var(--color-green)',
        color: 'white',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
          Install Laundristic
        </h4>
        <button
          onClick={() => setShowPrompt(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            padding: 0,
            cursor: 'pointer',
            minHeight: 'auto',
            minWidth: 'auto',
          }}
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
      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.4 }}>
        Tap the <strong>Share</strong> button at the bottom of Safari, then tap{' '}
        <strong>Add to Home Screen</strong> for offline access.
      </p>
    </div>
  );
};
