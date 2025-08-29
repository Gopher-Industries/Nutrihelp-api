// routes/verify.js
const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../new_utils/supabaseAdmin');

router.get('/verify-email/:token', async (req, res) => {
  const token = req.params.token;
  if (!token) return res.status(400).send('Token missing');

  try {
    // find token row
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .limit(1)
      .single();

    if (rowErr || !row) return res.status(400).send('Invalid token');

    // expiry check
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).send('Token expired');
    }

    const userEmail = row.user_email; // <-- IMPORTANT: your table uses user_email

    // update users table to mark verified (adjust column/table names if needed)
    // assumes users table has 'email' and 'is_email_verified' columns
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .update({ is_email_verified: true })
      .eq('email', userEmail);

    if (userErr) {
      console.error('Failed to update user:', userErr);
      return res.status(500).send('Failed to update user verification');
    }

    // delete token so it can't be reused (or update used_at if you prefer)
    await supabaseAdmin
      .from('email_verification_tokens')
      .delete()
      .eq('id', row.id);

    // Return a simple HTML success page (or JSON if you prefer)
    return res.send(`
      <html>
        <head><title>Email verified</title></head>
        <body style="font-family: Arial; text-align:center; padding:40px;">
          <h1>✅ Email verified</h1>
          <p>${userEmail} has been verified.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('verify-email error', err);
    return res.status(500).send('Internal server error');
  }
});

module.exports = router;
