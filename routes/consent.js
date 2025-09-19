// routes/consent.js
const express = require('express');
const router = express.Router();
const supabase = require('../new_utils/supabaseAdmin'); // SERVICE_ROLE client

// ───────────────────────────────────────────────────────────────
// CREATE / UPSERT
// POST /api/consents
// Body: { user_id, user_email?, consent_type, granted:boolean, metadata? }
// Unique key: (user_id, consent_type)
// ───────────────────────────────────────────────────────────────
router.post('/consents', async (req, res) => {
  try {
    const { user_id, user_email, consent_type, granted, metadata } = req.body || {};
    if (!user_id || !consent_type || typeof granted !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'user_id, consent_type and granted (boolean) are required' });
    }

    const now = new Date().toISOString();
    const row = {
      user_id,
      user_email: user_email || null,
      consent_type,
      granted: !!granted,
      revoked_at: granted ? null : now,
      metadata: metadata || null,
    };

    const { data, error } = await supabase
      .from('consents')
      .upsert(row, { onConflict: 'user_id,consent_type' })
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json({ message: 'Consent saved', row: data });
  } catch (e) {
    console.error('[consents POST] error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ───────────────────────────────────────────────────────────────
// LIST
// GET /api/consents/:user_id
// ───────────────────────────────────────────────────────────────
router.get('/consents/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { data, error } = await supabase
      .from('consents')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ consents: data });
  } catch (e) {
    console.error('[consents GET] error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ───────────────────────────────────────────────────────────────
// REVOKE by consent row PK
// PATCH /api/consents/:id/revoke
// Also supports /api/consents/:uuid/revoke (Swagger alias)
// ───────────────────────────────────────────────────────────────
async function revokeByIdHandler(req, res) {
  try {
    // Accept both param names
    const id = req.params.id || req.params.uuid;
    console.log('[revokeById] params =', req.params, 'resolved id =', id);
    if (!id) return res.status(400).json({ error: 'Missing consent id' });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('consents')
      .update({ granted: false, revoked_at: now })
      .eq('id', id)
      .select('*');

    // data can be [] if nothing matched
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Consent not found' });

    // If somehow multiple rows matched (shouldn’t happen for PK), return the first
    return res.status(200).json({ message: 'Consent revoked', row: data[0] });
  } catch (e) {
    console.error('[revokeById] error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
router.patch('/consents/:id/revoke', revokeByIdHandler);
router.patch('/consents/:uuid/revoke', revokeByIdHandler); // Swagger still using {uuid}

// ───────────────────────────────────────────────────────────────
// REVOKE by (user_id, consent_type) unique pair
// PATCH /api/consents/by-user/:user_id/:consent_type/revoke
// ───────────────────────────────────────────────────────────────
router.patch('/consents/by-user/:user_id/:consent_type/revoke', async (req, res) => {
  try {
    const { user_id, consent_type } = req.params;
    console.log('[revokeByUser] params =', req.params);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('consents')
      .update({ granted: false, revoked_at: now })
      .eq('user_id', user_id)
      .eq('consent_type', consent_type)
      .select('*');

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Consent not found' });

    // unique constraint should make this 1 row; handle array defensively
    return res.status(200).json({ message: 'Consent revoked', row: data[0] });
  } catch (e) {
    console.error('[revokeByUser] error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
