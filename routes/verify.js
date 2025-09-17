// routes/verify.js
const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../new_utils/supabaseAdmin'); // should use SERVICE_ROLE key

router.get('/verify-email/:token', async (req, res) => {
  const token = req.params.token;
  if (!token) return res.status(400).send('Token missing');

  try {
    // 1) find token row (only what we need)
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('id, user_email, expires_at, verified_at')
      .eq('token', token)
      .single();

    if (rowErr || !row) return res.status(400).send('Invalid or expired link');

    // 2) already used?
    if (row.verified_at) {
      return res.status(400).send('This link was already used');
    }

    // 3) expired? (treat null as “no expiry”)
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(400).send('This link has expired');
    }

    // 4) mark token as verified (single-use)
    const now = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from('email_verification_tokens')
      .update({ verified_at: now })
      .eq('id', row.id);

    if (updErr) {
      console.error('[verify-email] token update error:', updErr);
      return res.status(500).send('Failed to verify token');
    }

    // 5) success page (or redirect to frontend if you prefer)
    const email = row.user_email;
    return res.send(`
      <html>
        <head><title>Email verified</title></head>
        <body style="font-family: Arial; text-align:center; padding:40px;">
          <h1>✅ Email verified</h1>
          <p>${email} has been verified via token.</p>
          <p>This verification link is now single-use.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('verify-email error', err);
    return res.status(500).send('Internal server error');
  }
});

module.exports = router;
