import React, { useState } from 'react';

const AlertCard = ({ alert, onAcknowledge, severityColor }) => {
  const [expanded, setExpanded] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '✅';
      default: return '❓';
    }
  };

  const getChannelIcons = (channels) => {
    if (!channels) return [];
    return channels.map(channel => {
      switch (channel.toLowerCase()) {
        case 'email': return '📧';
        case 'slack': return '💬';
        case 'sms': return '📱';
        default: return '📢';
      }
    });
  };

  const handleAcknowledge = async () => {
    if (acknowledging) return;

    setAcknowledging(true);
    try {
      await onAcknowledge(alert.alert_id);
    } finally {
      setAcknowledging(false);
    }
  };

  const renderPayloadValue = (value) => {
    if (value === null || value === undefined) return 'N/A';

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      if (value.length <= 3) {
        return value.join(', ');
      }
      return `${value.slice(0, 3).join(', ')} (+${value.length - 3} more)`;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  return (
    <div className={`alert-card ${alert.severity?.toLowerCase() || 'unknown'} ${alert.acknowledged ? 'acknowledged' : 'unacknowledged'}`}>
      <div className="alert-header" onClick={() => setExpanded(!expanded)}>
        <div className="alert-title">
          <span className="severity-icon">{getSeverityIcon(alert.severity)}</span>
          <span className="alert-id">{alert.alert_id}</span>
          <span className="severity-badge" style={{ backgroundColor: severityColor }}>
            {alert.severity || 'Unknown'}
          </span>
        </div>

        <div className="alert-meta">
          <span className="timestamp">{formatTimestamp(alert.created_at)}</span>
          <span className="expand-toggle">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      <div className="alert-summary">
        <p className="trigger-summary">{alert.trigger_summary || 'No summary available'}</p>

        {alert.notification_channels && alert.notification_channels.length > 0 && (
          <div className="channels">
            {getChannelIcons(alert.notification_channels).map((icon, index) => (
              <span key={index} className="channel-icon" title={alert.notification_channels[index]}>
                {icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="alert-details">
          <div className="detail-section">
            <h4>Alert Information</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Alert ID:</strong> {alert.alert_id}
              </div>
              <div className="detail-item">
                <strong>Severity:</strong> {alert.severity || 'Unknown'}
              </div>
              <div className="detail-item">
                <strong>Status:</strong>
                {alert.acknowledged ? (
                  <span className="status-acknowledged">✅ Acknowledged</span>
                ) : (
                  <span className="status-unacknowledged">⏳ Unacknowledged</span>
                )}
              </div>
              <div className="detail-item">
                <strong>Triage SLA:</strong> {alert.triage_sla_minutes || 'N/A'} minutes
              </div>
              <div className="detail-item">
                <strong>Fingerprint:</strong> {alert.fingerprint || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Created:</strong> {formatTimestamp(alert.created_at)}
              </div>
              {alert.acknowledged_at && (
                <div className="detail-item">
                  <strong>Acknowledged:</strong> {formatTimestamp(alert.acknowledged_at)}
                </div>
              )}
            </div>
          </div>

          {alert.payload && Object.keys(alert.payload).length > 0 && (
            <div className="detail-section">
              <h4>Alert Payload</h4>
              <div className="payload-grid">
                {Object.entries(alert.payload).map(([key, value]) => (
                  <div key={key} className="payload-item">
                    <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>
                    <span className="payload-value">{renderPayloadValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alert.response_actions && alert.response_actions.length > 0 && (
            <div className="detail-section">
              <h4>Response Actions</h4>
              <ol className="response-actions">
                {alert.response_actions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ol>
            </div>
          )}

          {!alert.acknowledged && (
            <div className="alert-actions">
              <button
                className="acknowledge-btn"
                onClick={handleAcknowledge}
                disabled={acknowledging}
              >
                {acknowledging ? '🔄 Acknowledging...' : '✅ Acknowledge Alert'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { AlertCard };