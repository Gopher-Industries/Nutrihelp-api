import React, { useState, useEffect, useCallback } from 'react';
import './AlertDashboard.css';
import AlertCard from './AlertCard';
import AlertSummary from './AlertSummary';
import { useDarkMode } from '../../routes/DarkModeToggle/DarkModeContext';

// Force HTTPS for all API calls (required for backend)
const API_BASE = (process.env.REACT_APP_API_BASE_URL || 'https://localhost:443/api')
  .replace('http://', 'https://');

const ALERT_COLORS = {
  'A1': '#FF6B6B', // brute force
  'A2': '#FF8C42', // token anomaly
  'A3': '#FFD93D', // rapid login failure
  'A4': '#6BCB77', // geo-impossible
  'A5': '#4D96FF', // unusual time
  'A6': '#9B59B6', // geo-impossible travel
  'A7': '#E74C3C', // token lifecycle
  'A8': '#16A085', // correlated incident
  'A9': '#C0392B', // file integrity
  'A10': '#8E44AD', // monitoring pipeline
  'A11': '#27AE60', // API anomaly
  'A12': '#E67E22', // crypto anomaly
};

const ALERT_DESCRIPTIONS = {
  'A1': 'Brute Force Attempt',
  'A2': 'Token Anomaly',
  'A3': 'Rapid Login Failure',
  'A4': 'Geo-Impossible Login',
  'A5': 'Unusual Login Time',
  'A6': 'Geo-Impossible Travel',
  'A7': 'Token Lifecycle Anomaly',
  'A8': 'Correlated Incident',
  'A9': 'File Integrity Violation',
  'A10': 'Monitoring Pipeline Failure',
  'A11': 'API Anomaly',
  'A12': 'Cryptographic Anomaly',
};

function AlertDashboard() {
  const { darkMode } = useDarkMode();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = `${API_BASE}/login-dashboard`;
      const fetchOpts = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      };

      const params = new URLSearchParams({ limit: 500 });
      if (timeRange !== 'all') params.set('range', timeRange);

      const [alertsData, summaryData] = await Promise.all([
        fetch(`${baseUrl}/alerts?${params}`, fetchOpts).then(r => {
          if (!r.ok) throw new Error(`Alerts: ${r.status} ${r.statusText}`);
          return r.json();
        }),
        fetch(`${baseUrl}/alerts/summary?hours=24`, fetchOpts).then(r => {
          if (!r.ok) throw new Error(`Summary: ${r.status} ${r.statusText}`);
          return r.json();
        }),
      ]);

      setAlerts(alertsData.alerts || []);
      setSummary(summaryData.alert_summary || {});
      setError(null);
      setLastRefreshed(new Date());
      console.log('[AlertDashboard] Loaded', (alertsData.alerts || []).length, 'alerts | source:', alertsData.source);
    } catch (e) {
      const msg = e instanceof TypeError
        ? `Network error (CORS/SSL?): ${e.message}`
        : e.message || String(e);
      console.error('[AlertDashboard] Error:', msg, e);
      setError(`Failed to fetch alerts: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAlerts]);

  const handleStatusChange = async (id, status) => {
    const res = await fetch(`${API_BASE}/login-dashboard/alerts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
    const data = await res.json();
    // Optimistic update in local state
    setAlerts(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, status, resolved_at: data.alert?.resolved_at ?? a.resolved_at }
          : a
      )
    );
  };

  // Stats from all fetched alerts
  const totalAlerts = alerts.length;
  const openCount = alerts.filter(a => !a.status || a.status === 'open').length;
  const criticalCount = alerts.filter(a =>
    String(a.severity || '').toLowerCase() === 'critical' && a.status !== 'resolved'
  ).length;
  const acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  // Client-side status filter applied on top of time-range–filtered data from API
  const filteredAlerts = alerts.filter(a => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return !a.status || a.status === 'open';
    return a.status === statusFilter;
  });

  const TIME_RANGES = [
    { value: 'today', label: 'Today' },
    { value: '7d',    label: '7 Days' },
    { value: '30d',   label: '30 Days' },
    { value: 'all',   label: 'All Time' },
  ];

  const STATUS_FILTERS = [
    { value: 'all',          label: 'All',        count: totalAlerts },
    { value: 'open',         label: '● Open',     count: openCount },
    { value: 'acknowledged', label: '◐ Ack',      count: acknowledgedCount },
    { value: 'resolved',     label: '✓ Resolved', count: resolvedCount },
  ];

  return (
    <div className={`alert-dashboard ${darkMode ? 'dark-mode' : ''}`}>

      {/* ── Header ── */}
      <div className="ad-header">
        <div className="ad-header-inner">
          <div className="ad-header-title">
            <span className="ad-shield-icon">🛡️</span>
            <div>
              <h1>Security Alert Dashboard</h1>
              <p>Real-time monitoring of system security events</p>
            </div>
          </div>
          <div className="ad-header-meta">
            {lastRefreshed && (
              <span className="ad-last-updated">
                Updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <div className={`ad-live-badge ${loading ? 'syncing' : 'live'}`}>
              <span className="ad-live-dot" />
              {loading ? 'Syncing…' : 'Live'}
            </div>
          </div>
        </div>
      </div>

      <div className="ad-body">

        {/* ── Stats Row ── */}
        <div className="ad-stats-row">
          <div className="ad-stat-card">
            <div className="ad-stat-icon ad-stat-icon--total">📋</div>
            <div className="ad-stat-info">
              <span className="ad-stat-value">{totalAlerts}</span>
              <span className="ad-stat-label">Total Alerts</span>
            </div>
          </div>
          <div
            className={`ad-stat-card ad-stat-card--open ${statusFilter === 'open' ? 'ad-stat-card--active' : ''}`}
            onClick={() => setStatusFilter(s => s === 'open' ? 'all' : 'open')}
          >
            <div className="ad-stat-icon ad-stat-icon--open">🔓</div>
            <div className="ad-stat-info">
              <span className="ad-stat-value">{openCount}</span>
              <span className="ad-stat-label">Open</span>
            </div>
          </div>
          <div className="ad-stat-card ad-stat-card--critical">
            <div className="ad-stat-icon ad-stat-icon--critical">🚨</div>
            <div className="ad-stat-info">
              <span className="ad-stat-value">{criticalCount}</span>
              <span className="ad-stat-label">Critical</span>
            </div>
          </div>
          <div
            className={`ad-stat-card ad-stat-card--ack ${statusFilter === 'acknowledged' ? 'ad-stat-card--active' : ''}`}
            onClick={() => setStatusFilter(s => s === 'acknowledged' ? 'all' : 'acknowledged')}
          >
            <div className="ad-stat-icon ad-stat-icon--ack">◐</div>
            <div className="ad-stat-info">
              <span className="ad-stat-value">{acknowledgedCount}</span>
              <span className="ad-stat-label">Acknowledged</span>
            </div>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="ad-error-banner">
            <span>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong>{error}</strong>
              <div style={{ fontSize: '0.75rem', marginTop: '6px', opacity: 0.85, lineHeight: '1.4' }}>
                💡 <strong>Fix:</strong> Open DevTools (F12) → Console for details.
                If SSL error: visit <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '3px' }}>
                  https://localhost/api/login-dashboard/ping
                </code> and accept the self-signed cert.
              </div>
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="ad-controls">
          <div className="ad-filter-groups">
            <div className="ad-filter-group">
              <span className="ad-filter-label">Time Range</span>
              <div className="ad-filters">
                {TIME_RANGES.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`ad-filter-btn ${timeRange === value ? 'active' : ''}`}
                    onClick={() => setTimeRange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ad-filter-divider" />
            <div className="ad-filter-group">
              <span className="ad-filter-label">Status</span>
              <div className="ad-filters">
                {STATUS_FILTERS.map(({ value, label, count }) => (
                  <button
                    key={value}
                    className={`ad-filter-btn ${statusFilter === value ? 'active' : ''} ${value === 'open' && openCount > 0 ? 'ad-filter-btn--has-items' : ''}`}
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                    <span className="ad-filter-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="ad-actions">
            <label className="ad-auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Auto-refresh (30s)</span>
            </label>
            <button
              className="ad-refresh-btn"
              onClick={fetchAlerts}
              disabled={loading}
            >
              {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
            </button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="ad-content-grid">

          {/* Alerts List */}
          <div className="ad-alerts-panel">
            <div className="ad-panel-header">
              <h2>Recent Alerts</h2>
              <span className="ad-panel-count">{filteredAlerts.length}</span>
            </div>
            {loading && alerts.length === 0 ? (
              <div className="ad-loading-state">
                <div className="ad-spinner" />
                <p>Loading alerts…</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="ad-empty-state">
                <span className="ad-empty-icon">✓</span>
                <p>No alerts to display</p>
                <span>
                  {statusFilter !== 'all'
                    ? `No ${statusFilter} alerts in this time range`
                    : 'System is operating normally'}
                </span>
              </div>
            ) : (
              <div className="ad-alerts-list">
                {filteredAlerts.map((alert, idx) => (
                  <AlertCard
                    key={`${alert.id || alert.alert_type}-${alert.created_at}-${idx}`}
                    alert={alert}
                    color={ALERT_COLORS[alert.alert_type]}
                    description={ALERT_DESCRIPTIONS[alert.alert_type]}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="ad-summary-panel">
            <AlertSummary
              summary={summary}
              colors={ALERT_COLORS}
              descriptions={ALERT_DESCRIPTIONS}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default AlertDashboard;
