const express = require('express');
const router = express.Router();
const supabase = require('../dbConnection');
const normalizeId = require('../utils/normalizeId');

router.get('/', async (req, res) => {
  try {
    const userId = normalizeId(req.query.user_id);
    const date = req.query.date || new Date().toISOString().split('T')[0];

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

router.post('/', async (req, res) => {
  try {
    const userId = normalizeId(req.body.user_id);
    const { amount_ml, date } = req.body;

    const { data, error } = await supabase
      .from('water_intake')
      .insert([{ user_id: userId, amount_ml, date: date || new Date().toISOString().split('T')[0] }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
