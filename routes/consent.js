const express = require('express');
const router = express.Router();
const supabase = require('../new_utils/supabaseAdmin'); // default export above

// POST /api/consents  -> save a consent
router.post('/consents', async (req, res) => {
  try {
    const { user_id, user_email, consent_type, granted, metadata } = req.body || {};

    if (!user_id || !consent_type || typeof granted !== 'boolean') {
      return res.status(400).json({
        error: 'user_id, consent_type and granted (boolean) are required'
      });
    }

    const row = {
      user_id,
      user_email: user_email || null,
      consent_type,
      granted,
      metadata: metadata || null,
      revoked_at: null
    };

    const { data, error } = await supabase
      .from('consents')
      .insert(row)
      .select();                      // return inserted row(s)

    if (error) throw error;
    return res.status(201).json({ message: 'Consent saved', row: data[0] });
  } catch (e) {
    console.error('save consent error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /consents/:user_id  -> list consents for a user
router.get('/consents/:user_id', async (req, res) => {
  const { user_id } = req.params; // UUID
  const { data, error } = await supabase
    .from('consents')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ consents: data });
});

// PATCH /consents/:uuid/revoke  -> revoke by primary key
router.patch('/consents/:uuid/revoke', async (req, res) => {
  const { uuid } = req.params; // primary key (UUID)
  const { data, error } = await supabase
    .from('consents')
    .update({ granted: false, revoked_at: new Date().toISOString() })
    .eq('uuid', uuid)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: 'Consent not found' });
  return res.status(200).json({ message: 'Consent revoked', row: data[0] });
});

module.exports = router;
