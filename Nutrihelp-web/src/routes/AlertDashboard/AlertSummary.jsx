import React from 'react';

const AlertSummary = ({ totalAlerts, criticalCount, highCount, unacknowledgedCount }) => {
  const getStatusColor = () => {
    if (criticalCount > 0) return '#dc3545'; // Red for critical
    if (highCount > 0) return '#fd7e14'; // Orange for high
    if (unacknowledgedCount > 0) return '#ffc107'; // Yellow for unacknowledged
    return '#28a745'; // Green for all good
  };

  const getStatusIcon = () => {
    if (criticalCount > 0) return '🚨';
    if (highCount > 0) return '⚠️';
    if (unacknowledgedCount > 0) return '⏳';
    return '✅';
  };

  const getStatusText = () => {
    if (criticalCount > 0) return 'Critical alerts require immediate attention';
    if (highCount > 0) return 'High priority alerts detected';
    if (unacknowledgedCount > 0) return 'Unacknowledged alerts pending';
    return 'All systems operating normally';
  };

  return (
    <div className="alert-summary" style={{ borderColor: getStatusColor() }}>
      <div className="summary-header">
        <span className="status-icon">{getStatusIcon()}</span>
        <h2>Alert Summary</h2>
      </div>

      <div className="summary-stats">
        <div className="stat-item total">
          <div className="stat-value">{totalAlerts}</div>
          <div className="stat-label">Total Alerts</div>
        </div>

        <div className="stat-item critical">
          <div className="stat-value">{criticalCount}</div>
          <div className="stat-label">Critical</div>
        </div>

        <div className="stat-item high">
          <div className="stat-value">{highCount}</div>
          <div className="stat-label">High</div>
        </div>

        <div className="stat-item unacknowledged">
          <div className="stat-value">{unacknowledgedCount}</div>
          <div className="stat-label">Unacknowledged</div>
        </div>
      </div>

      <div className="summary-status" style={{ color: getStatusColor() }}>
        {getStatusText()}
      </div>

      <div className="summary-breakdown">
        <div className="breakdown-item">
          <span className="breakdown-label">System Health:</span>
          <span className="breakdown-value">
            {criticalCount > 0 ? '🔴 Compromised' :
             highCount > 0 ? '🟠 At Risk' :
             unacknowledgedCount > 0 ? '🟡 Monitoring' :
             '🟢 Normal'}
          </span>
        </div>

        <div className="breakdown-item">
          <span className="breakdown-label">Response Priority:</span>
          <span className="breakdown-value">
            {criticalCount > 0 ? 'P0 - Immediate' :
             highCount > 0 ? 'P1 - Urgent' :
             unacknowledgedCount > 0 ? 'P2 - Review' :
             'P3 - Routine'}
          </span>
        </div>
      </div>
    </div>
  );
};

export { AlertSummary };