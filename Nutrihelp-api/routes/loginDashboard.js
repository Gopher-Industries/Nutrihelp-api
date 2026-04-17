// routes/loginDashboard.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('../database/supabaseClient');
const { checkAlerts } = require('../services/securityAlertService');
 
const router = express.Router();
 
const TZ = process.env.APP_TIMEZONE || 'Australia/Melbourne';
const DASHBOARD_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost:3000',
  'https://127.0.0.1:3000',
  'http://localhost',
  'https://localhost'
];

const dashboardCors = cors({
  origin(origin, callback) {
    if (!origin || DASHBOARD_ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Dashboard CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'PATCH', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

router.use(dashboardCors);
router.options(/.*/, dashboardCors);
router.use(express.json({ limit: '1mb' }));
router.use(express.urlencoded({ extended: false }));

function isMissingRelationError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('does not exist') || message.includes('relation') || error?.code === '42P01';
}

function normalizeLiveAlert(alert, checkedAt) {
  return {
    alert_type: alert.alert_id,
    severity: String(alert.severity || 'medium').toLowerCase(),
    message: alert.trigger_summary || 'Security alert triggered',
    context: alert.payload || {},
    count: 1,
    created_at: checkedAt,
    fingerprint:
      alert.fingerprint ||
      alert.payload?.account_identifier ||
      alert.payload?.source_ip ||
      null,
    source: 'live'
  };
}

async function getDashboardAlerts(limit = 50, filters = {}) {
  const cappedLimit = Math.min(Number(limit) || 50, 500);
  const { status, since, until } = filters;

  try {
    let query = supabase
      .from('alert_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(cappedLimit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (since) {
      query = query.gte('created_at', since);
    }
    if (until) {
      query = query.lte('created_at', until);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      source: 'history',
      checked_at: new Date().toISOString(),
      alerts: data || []
    };
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    const liveResults = await checkAlerts({ send: false, source: 'dashboard-live' });
    const checkedAt = liveResults.checked_at || new Date().toISOString();
    const alerts = (liveResults.alerts || [])
      .map((alert) => normalizeLiveAlert(alert, checkedAt))
      .slice(0, cappedLimit);

    return {
      source: 'live',
      checked_at: checkedAt,
      alerts,
      error: liveResults.error || null
    };
  }
}
 
// Health check
router.get('/ping', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('audit_logs').select('id').limit(1);
    if (error) throw error;
    res.json({ ok: true, sampleRowFound: data?.length > 0 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});
 
// 24h KPI
router.get('/kpi', async (_req, res) => {
  const { data, error } = await supabase.rpc('login_kpi_24h');
  if (error) return res.status(500).json({ error: String(error.message || error) });
  res.json(data?.[0] || {});
});
 
// Daily attempts/success/failure
router.get('/daily', async (req, res) => {
  const days = Number(req.query.days) || 30;
  const { data, error } = await supabase.rpc('login_daily', { tz: TZ, lookback_days: days });
  if (error) return res.status(500).json({ error: String(error.message || error) });
  res.json(data || []);
});
 
// Daily active users (unique successful logins)
router.get('/dau', async (req, res) => {
  const days = Number(req.query.days) || 30;
  const { data, error } = await supabase.rpc('login_dau', { tz: TZ, lookback_days: days });
  if (error) return res.status(500).json({ error: String(error.message || error) });
  res.json(data || []);
});
 
// Top failing IPs (7 days)
router.get('/top-failing-ips', async (_req, res) => {
  const { data, error } = await supabase.rpc('login_top_failing_ips_7d');
  if (error) return res.status(500).json({ error: String(error.message || error) });
  res.json(data || []);
});
 
// Failures by email domain (7 days)
router.get('/fail-by-domain', async (_req, res) => {
  const { data, error } = await supabase.rpc('login_fail_by_domain_7d');
  if (error) return res.status(500).json({ error: String(error.message || error) });
  res.json(data || []);
});

// Security alerts history (recent alerts)
router.get('/alerts', async (req, res) => {
  try {
    const { limit, status, range } = req.query;

    // Compute 'since' from named range
    let since;
    if (range && range !== 'all') {
      const now = Date.now();
      if (range === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        since = d.toISOString();
      } else if (range === '7d') {
        since = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (range === '30d') {
        since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const filters = { status: status || 'all', since };
    const results = await getDashboardAlerts(limit, filters);
    res.json({
      total: results.alerts.length,
      alerts: results.alerts,
      source: results.source,
      checked_at: results.checked_at,
      timestamp: new Date().toISOString(),
      error: results.error || undefined
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Security alerts by type (aggregated counts)
router.get('/alerts/summary', async (req, res) => {
  try {
    const hours = Number(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const results = await getDashboardAlerts(200);
    const alerts = (results.alerts || []).filter((alert) => alert.created_at >= since);
    
    // Group by alert_type and sum counts
    const summary = {};
    alerts.forEach((alert) => {
      if (!summary[alert.alert_type]) {
        summary[alert.alert_type] = 0;
      }
      summary[alert.alert_type] += Number(alert.count) || 1;
    });
    
    res.json({
      period_hours: hours,
      since,
      alert_summary: summary,
      source: results.source,
      checked_at: results.checked_at,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Critical alerts (only active/unresolved)
router.get('/alerts/critical', async (_req, res) => {
  try {
    const results = await getDashboardAlerts(200);
    const criticalAlerts = (results.alerts || [])
      .filter((alert) => String(alert.severity || '').toLowerCase() === 'critical')
      .slice(0, 20);

    res.json({
      total: criticalAlerts.length,
      critical_alerts: criticalAlerts,
      source: results.source,
      checked_at: results.checked_at,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Update alert status (acknowledge / resolve / reopen)
router.patch('/alerts/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid alert id' });
  }
  const { status } = req.body || {};
  const VALID = ['open', 'acknowledged', 'resolved'];
  if (!VALID.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
  }
  try {
    const updateData = { status };
    if (status === 'resolved') updateData.resolved_at = new Date().toISOString();
    if (status === 'open')     updateData.resolved_at = null;

    const { data, error } = await supabase
      .from('alert_history')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Alert not found' });
    res.json({ ok: true, alert: data });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Manual retention policy: delete alerts older than N days (default 90)
router.post('/alerts/archive', async (req, res) => {
  const days = Math.max(1, Math.min(3650, Number((req.body || {}).days) || 90));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('alert_history')
      .delete()
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw error;
    const deleted = (data || []).length;
    res.json({ ok: true, deleted, cutoff, days_kept: days });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

module.exports = router;
 
 