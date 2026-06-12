import React from 'react';
import { useToast } from '../components';

export function Stats() {
  const { showToast } = useToast();

  return (
    <div className="screen-container">
      <header className="screen-header">
        <h1>Stats</h1>
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
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </div>
        <h2 className="empty-title">Your Laundry Habits</h2>
        <p className="empty-subtitle">
          Track your spending and history once you've completed some batches.
        </p>
        <button
          onClick={() =>
            showToast('Stats dashboard coming in P2.8!', 'success')
          }
          className="btn-secondary"
        >
          View mock data
        </button>
      </div>
    </div>
  );
}
