const express = require('express');
const router = express.Router();
const mealLogService = require('../../services/mealLogService');

// POST /ai-model/meals/log-scan
router.post('/log-scan', (req, res) => {
  try {
    const entry = mealLogService.createEntry(req.body || {});
    const daily_summary = mealLogService.getDailySummary({ targetDate: entry.date, userId: entry.user_id });
    return res.status(201).json({ entry, daily_summary });
  } catch (err) {
    if (err.message && err.message.startsWith('Invalid')) return res.status(400).json({ error: err.message });
    return res.status(500).json({ error: 'Failed to save meal log entry.' });
  }
});

// GET /ai-model/meals/nutrition-preview?label=...
router.get('/nutrition-preview', (req, res) => {
  const label = String(req.query.label || '').trim();
  if (!label) return res.status(400).json({ error: 'Label is required.' });
  const { lookup } = require('../../services/nutritionLookupService');
  const preview = lookup(label);
  return res.json({ label, ...preview });
});

// GET /ai-model/meals/logs?date=YYYY-MM-DD&user_id=...
router.get('/logs', (req, res) => {
  try {
    const entries = mealLogService.listEntries({
      targetDate: req.query.date || null,
      userId: req.query.user_id || null,
    });
    return res.json(entries);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /ai-model/meals/logs/:entry_id?user_id=...
router.delete('/logs/:entry_id', (req, res) => {
  const deleted = mealLogService.deleteEntry(req.params.entry_id, req.query.user_id || null);
  if (!deleted) return res.status(404).json({ error: 'Meal log entry not found.' });
  return res.json({ deleted: true, entry_id: req.params.entry_id });
});

// GET /ai-model/meals/daily-summary?date=YYYY-MM-DD&user_id=...
router.get('/daily-summary', (req, res) => {
  try {
    const summary = mealLogService.getDailySummary({
      targetDate: req.query.date || null,
      userId: req.query.user_id || null,
    });
    return res.json(summary);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /ai-model/meals/chat-context?date=YYYY-MM-DD&user_id=...
router.get('/chat-context', (req, res) => {
  try {
    const context = mealLogService.buildChatContext({
      targetDate: req.query.date || null,
      userId: req.query.user_id || null,
    });
    return res.json(context);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /ai-model/meals/plan-context?date_to=YYYY-MM-DD&days=7&user_id=...
router.get('/plan-context', (req, res) => {
  try {
    const context = mealLogService.buildPlanContext({
      userId: req.query.user_id || null,
      dateTo: req.query.date_to || null,
      days: req.query.days ? parseInt(req.query.days) : 7,
    });
    return res.json(context);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
