import React, { useState } from 'react';
import './AlertCard.css';

function AlertCard({ alert, color, description, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleStatusAction = async (e, newStatus) => {
    e.stopPropagation();
    if (!alert.id || !onStatusChange || actionLoading) return;
    setActionLoading(true);
    try {
      await onStatusChange(alert.id, newStatus);
    } finally {
      setActionLoading(false);
    }
  };

  const status = alert.status || 'open';
  const hasId = Boolean(alert.id);
  const statusLabel = { open: '● Open', acknowledged: '◐ Ack', resolved: '✓ Done' };

  return (
    <div
      className={`alert-card alert-card--${status}`}
      style={{ borderLeftColor: color }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="alert-card-header">
        <div className="alert-card-left">
          <div className="alert-badge" style={{ backgroundColor: color }}>
            {alert.alert_type}
          </div>
          <div className="alert-card-info">
            <h3>{description || alert.alert_type}</h3>
            <p className="alert-card-timestamp">{formatDate(alert.created_at)}</p>
          </div>
        </div>
        <div className="alert-card-right">
          {hasId && (
            <span className={`alert-status status-${status}`}>
              {statusLabel[status] || status}
            </span>
          )}
          <span className={`alert-severity severity-${(alert.severity || 'medium').toLowerCase()}`}>
            {(alert.severity || 'medium').toUpperCase()}
          </span>
          <span className="alert-expand-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {expanded && (
        <div className="alert-card-details" onClick={(e) => e.stopPropagation()}>
          <div className="detail-section">
            <strong>Message</strong>
            <p>{alert.message || 'No additional details'}</p>
          </div>

          {alert.context && Object.keys(alert.context).length > 0 && (
            <div className="detail-section">
              <strong>Context</strong>
              <pre className="detail-code">
                {typeof alert.context === 'string'
                  ? alert.context
                  : JSON.stringify(alert.context, null, 2)}
              </pre>
            </div>
          )}

          {alert.count > 1 && (
            <div className="detail-section">
              <strong>Occurrence Count</strong>
              <p>{alert.count}</p>
            </div>
          )}

          <div className="detail-row">
            <div className="detail-section">
              <strong>Created</strong>
              <p>{new Date(alert.created_at).toLocaleString()}</p>
            </div>
            {alert.resolved_at && (
              <div className="detail-section">
                <strong>Resolved</strong>
                <p>{new Date(alert.resolved_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {alert.fingerprint && (
            <div className="detail-section">
              <strong>Fingerprint</strong>
              <p className="fingerprint">{alert.fingerprint}</p>
            </div>
          )}

          {hasId && onStatusChange && (
            <div className="alert-actions">
              {status === 'open' && (
                <>
                  <button
                    className="alert-action-btn alert-action-btn--acknowledge"
                    disabled={actionLoading}
                    onClick={(e) => handleStatusAction(e, 'acknowledged')}
                  >
                    ◐ Acknowledge
                  </button>
                  <button
                    className="alert-action-btn alert-action-btn--resolve"
                    disabled={actionLoading}
                    onClick={(e) => handleStatusAction(e, 'resolved')}
                  >
                    ✓ Resolve
                  </button>
                </>
              )}
              {status === 'acknowledged' && (
                <>
                  <button
                    className="alert-action-btn alert-action-btn--resolve"
                    disabled={actionLoading}
                    onClick={(e) => handleStatusAction(e, 'resolved')}
                  >
                    ✓ Resolve
                  </button>
                  <button
                    className="alert-action-btn alert-action-btn--reopen"
                    disabled={actionLoading}
                    onClick={(e) => handleStatusAction(e, 'open')}
                  >
                    ↺ Reopen
                  </button>
                </>
              )}
              {status === 'resolved' && (
                <button
                  className="alert-action-btn alert-action-btn--reopen"
                  disabled={actionLoading}
                  onClick={(e) => handleStatusAction(e, 'open')}
                >
                  ↺ Reopen
                </button>
              )}
              {actionLoading && <span className="alert-action-loading">saving…</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AlertCard;
