import React from 'react';
import { useToast } from '../components';

export function DropOffs() {
  const { showToast } = useToast();

  return (
    <div className="screen-container">
      <header className="screen-header">
        <h1>Drop-offs</h1>
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
          onClick={() =>
            showToast('New Drop-off feature coming in P2.5!', 'info')
          }
          className="btn-primary"
        >
          New Drop-off
        </button>
      </div>
    </div>
  );
}
