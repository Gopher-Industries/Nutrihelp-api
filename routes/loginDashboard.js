// routes/loginDashboard.js
const express = require('express');
require('dotenv').config();
const loginDashboardRepository = require('../repositories/loginDashboardRepository');
 
const router = express.Router();
 
const TZ = process.env.APP_TIMEZONE || 'Australia/Melbourne';
 
// Health check
router.get('/ping', async (_req, res) => {
  try {
    const sampleRowFound = await loginDashboardRepository.auditLogSampleExists();
    res.json({ ok: true, sampleRowFound });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});
 
// 24h KPI
router.get('/kpi', async (_req, res) => {
  try {
    const data = await loginDashboardRepository.getLoginKpi24h();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});
 
// Daily attempts/success/failure
router.get('/daily', async (req, res) => {
  const days = Number(req.query.days) || 30;
  try {
    const data = await loginDashboardRepository.getLoginDaily(TZ, days);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});
 
// Daily active users (unique successful logins)
router.get('/dau', async (req, res) => {
  const days = Number(req.query.days) || 30;
  try {
    const data = await loginDashboardRepository.getLoginDau(TZ, days);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});
 
// Top failing IPs (7 days)
router.get('/top-failing-ips', async (_req, res) => {
  try {
    const data = await loginDashboardRepository.getTopFailingIps7d();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});
 
// Failures by email domain (7 days)
router.get('/fail-by-domain', async (_req, res) => {
  try {
    const data = await loginDashboardRepository.getFailByDomain7d();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});
 
module.exports = router;
 
 
