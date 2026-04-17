import React from 'react';
import './AlertSummary.css';

function AlertSummary({ summary, colors, descriptions }) {
  const sortedAlerts = Object.entries(summary)
    .sort((a, b) => b[1] - a[1]);

  const totalCount = Object.values(summary).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(summary), 1);

  return (
    <div className="alert-summary">

      <div className="as-header">
        <h2>Alert Summary (24h)</h2>
      </div>

      <div className="as-total-stat">
        <span className="as-total-label">Total Alerts</span>
        <span className="as-total-value">{totalCount}</span>
      </div>

      <div className="as-breakdown">
        {sortedAlerts.length === 0 ? (
          <p className="as-no-data">No alerts in the last 24 hours</p>
        ) : (
          sortedAlerts.map(([alertType, count]) => (
            <div key={alertType} className="as-item">
              <div className="as-item-header">
                <div className="as-item-type">
                  <span
                    className="as-type-badge"
                    style={{ backgroundColor: colors[alertType] }}
                  >
                    {alertType}
                  </span>
                  <span className="as-type-name">{descriptions[alertType]}</span>
                </div>
                <span className="as-type-count">{count}</span>
              </div>
              <div className="as-bar">
                <div
                  className="as-bar-fill"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    backgroundColor: colors[alertType],
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="as-legend">
        <h3>Severity Levels</h3>
        <div className="as-legend-items">
          <div className="as-legend-item">
            <span className="as-legend-dot critical" />
            <span>Critical</span>
          </div>
          <div className="as-legend-item">
            <span className="as-legend-dot high" />
            <span>High</span>
          </div>
          <div className="as-legend-item">
            <span className="as-legend-dot medium" />
            <span>Medium</span>
          </div>
          <div className="as-legend-item">
            <span className="as-legend-dot low" />
            <span>Low</span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default AlertSummary;
