const express = require('express');
const router = express.Router();
const supabase = require('../dbConnection');
const { authenticateToken } = require('../middleware/authenticateToken');
const normalizeId = require('../utils/normalizeId');

function resolveWaterIntakeUserId(req) {
  const requestUserId = req.query.user_id || req.body?.user_id;
  const currentUserId = req.user?.userId;
  const role = String(req.user?.role || '').toLowerCase();

  if ((role === 'admin' || role === 'nutritionist') && requestUserId) {
    return normalizeId(requestUserId);
  }

  return currentUserId;
}

function normalizeIsoDate(value) {
  return value || new Date().toISOString().split('T')[0];
}

function toAmountMl(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = resolveWaterIntakeUserId(req);
    const date = normalizeIsoDate(req.query.date);

    const { data, error } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = resolveWaterIntakeUserId(req);
    const amountMl = toAmountMl(req.body?.amount_ml);
    const date = normalizeIsoDate(req.body?.date);

    if (!userId || amountMl == null) {
      return res.status(400).json({ error: 'user_id and amount_ml are required' });
    }

    const { data: existingRows, error: lookupError } = await supabase
      .from('water_intake')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .limit(1);

    if (lookupError) throw lookupError;

    const existingEntry = Array.isArray(existingRows) ? existingRows[0] : null;
    let data;
    let error;

    if (existingEntry?.id) {
      ({ data, error } = await supabase
        .from('water_intake')
        .update({ amount_ml: amountMl, date })
        .eq('id', existingEntry.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('water_intake')
        .insert([{ user_id: userId, amount_ml: amountMl, date }])
        .select()
        .single());
    }

    if (error) throw error;
    res.status(existingEntry?.id ? 200 : 201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
