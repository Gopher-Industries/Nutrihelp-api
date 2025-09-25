// routes/loginDashboard.js
const express = require('express');
require('dotenv').config();
const supabase = require('../database/supabaseClient');
 
const router = express.Router();
 
const TZ = process.env.APP_TIMEZONE || 'Australia/Melbourne';
 
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
 
module.exports = router;
 
 