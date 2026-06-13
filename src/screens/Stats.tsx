import React, { useState, useEffect } from 'react';
import { getAllBatches } from '../lib/storage';
import { computeSpendStats, getMonthlySpendWindow } from '../lib/domain';
import type { SpendStats, MonthlySpend } from '../lib/domain';

export function Stats() {
  const [thirtyDayStats, setThirtyDayStats] = useState<SpendStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<SpendStats | null>(null);
  const [sixMonthBars, setSixMonthBars] = useState<MonthlySpend[]>([]);

  useEffect(() => {
    async function load() {
      const allBatches = await getAllBatches();

      const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = computeSpendStats(allBatches, thirtyDaysAgoMs);
      const allTime = computeSpendStats(allBatches);
      const bars = getMonthlySpendWindow(allBatches, 6);

      setThirtyDayStats(recent);
      setAllTimeStats(allTime);
      setSixMonthBars(bars);
    }
    load();
  }, []);

  if (!thirtyDayStats || !allTimeStats) return null;

  // Find max spend for bar chart scaling
  const maxSpend = Math.max(...sixMonthBars.map((m) => m.spend), 1); // fallback to 1 to avoid /0

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <div className="screen-container">
      <header className="screen-header">
        <h1>Stats</h1>
      </header>

      <div style={{ padding: '0 16px 16px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
          Last 30 Days
        </h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Spend</span>
            <span className="stat-value">₹{thirtyDayStats.totalSpend}</span>
            <span className="stat-sub">
              {thirtyDayStats.dropCount} drop-offs
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg / Drop</span>
            <span className="stat-value">
              ₹{Math.round(thirtyDayStats.avgPerDrop)}
            </span>
            <span className="stat-sub">Per visit</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg / Item</span>
            <span className="stat-value">
              ₹{Math.round(thirtyDayStats.avgPerGarment)}
            </span>
            <span className="stat-sub">Across all types</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">All-time</span>
            <span className="stat-value">₹{allTimeStats.totalSpend}</span>
            <span className="stat-sub">
              {allTimeStats.dropCount} total drop-offs
            </span>
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">6-Month History</h3>
          <div className="chart-bars">
            {sixMonthBars.map((m, i) => {
              const heightPct = (m.spend / maxSpend) * 100;
              return (
                <div key={i} className="chart-bar-col">
                  <div
                    className="chart-bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      minHeight: m.spend > 0 ? '4px' : '0',
                    }}
                    title={`₹${m.spend}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="chart-labels">
            {sixMonthBars.map((m, i) => (
              <span key={i} className="chart-label">
                {monthNames[m.month - 1]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
