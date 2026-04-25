import React, { useState, useEffect } from 'react';
import { AlertCard } from './AlertCard';
import { AlertSummary } from './AlertSummary';
import './AlertDashboard.css';

const AlertDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'critical', 'high', 'medium', 'low'
  const [timeRange, setTimeRange] = useState('24h'); // '1h', '6h', '24h', '7d'

  useEffect(() => {
    fetchAlerts();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [filter, timeRange]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/security/alerts?filter=${filter}&timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      const response = await fetch(`/api/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update local state
      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.alert_id === alertId
            ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : alert
        )
      );
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      setError(`Failed to acknowledge alert: ${err.message}`);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity?.toLowerCase() === filter;
  });

  const criticalCount = alerts.filter(a => a.severity?.toLowerCase() === 'critical').length;
  const highCount = alerts.filter(a => a.severity?.toLowerCase() === 'high').length;
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="alert-dashboard">
      <div className="dashboard-header">
        <h1>🔐 Security Alert Dashboard</h1>
        <p>Real-time monitoring and alerting system</p>
      </div>

      <AlertSummary
        totalAlerts={alerts.length}
        criticalCount={criticalCount}
        highCount={highCount}
        unacknowledgedCount={unacknowledgedCount}
      />

      <div className="dashboard-controls">
        <div className="control-group">
          <label htmlFor="severity-filter">Severity Filter:</label>
          <select
            id="severity-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="time-range">Time Range:</label>
          <select
            id="time-range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        <button
          className="refresh-btn"
          onClick={fetchAlerts}
          disabled={loading}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ Error loading alerts: {error}
        </div>
      )}

      <div className="alerts-container">
        {loading && alerts.length === 0 ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading security alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>No alerts found</h3>
            <p>All systems operating normally within the selected filters.</p>
          </div>
        ) : (
          <div className="alerts-grid">
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.alert_id + (alert.created_at || '')}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                severityColor={getSeverityColor(alert.severity)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
        <p>Auto-refresh: Every 30 seconds</p>
      </div>
    </div>
  );
};

export default AlertDashboard;