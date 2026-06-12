import React from 'react';
import { useToast } from '../components';

export function Wardrobe() {
  const { showToast } = useToast();

  return (
    <div className="screen-container">
      <header className="screen-header">
        <h1>Wardrobe</h1>
      </header>
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
        <h2 className="empty-title">Your Wardrobe</h2>
        <p className="empty-subtitle">
          Catalog your garments to keep track of what's at the laundry.
        </p>
        <button
          onClick={() => showToast('Cataloging starts in P2.3!', 'info')}
          className="btn-primary"
        >
          Catalog item
        </button>
      </div>
    </div>
  );
}
