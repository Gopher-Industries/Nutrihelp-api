// new_utils/sendVerificationEmail.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

// env keys (must exist in .env)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SENDGRID_KEY = process.env.SENDGRID_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || 'no-reply@example.com';
const DEV_VERIFY_BASE = process.env.DEV_VERIFY_BASE || `http://localhost:${process.env.PORT || 80}/api`;

// prepare token + expiry
const token = crypto.randomBytes(16).toString('hex');
const expiresAtISO = new Date(Date.now() + 24*60*60*1000).toISOString(); // 24h

// validate minimal env
if (!SUPABASE_URL) console.warn('WARN: SUPABASE_URL missing in .env');
if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('WARN: SUPABASE_SERVICE_ROLE_KEY missing — DB inserts that bypass RLS will fail');

// create admin client (server-side only)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false }
});

// helper to generate token
function genToken(len = 24) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

/**
 * sendVerificationEmail(email)
 * - inserts token into email_verification_tokens using admin client
 * - sends email using SendGrid if API key present
 * - returns { verifyUrl, token, insertData, sendgridResponse? }
 */
module.exports = async function sendVerificationEmail(email) {
  if (!email) throw new Error('email required');

  // create token + expiry (24h)
  const token = genToken(32);
  const expiresAtISO = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const createdAtISO = new Date().toISOString();

  // insert token row using admin client (bypass RLS)
  try {
    const { data: insertData, error: supabaseError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert([{
        user_email: email,
        token: token,
        expires_at: expiresAtISO,
        created_at: createdAtISO
      }]);

   if (supabaseError) {
  console.error('Supabase insert failed', supabaseError);
  throw new Error('Supabase insert failed');
}

    // build verification URL for dev/demo
    const verifyUrl = `${DEV_VERIFY_BASE.replace(/\/$/, '')}/verify-email/${token}`;

    // optionally send via SendGrid
    let sendgridResponse = undefined;
    if (SENDGRID_KEY) {
      sgMail.setApiKey(SENDGRID_KEY);
      const msg = {
        to: email,
        from: SENDGRID_FROM,
        subject: 'NutriHelp — Verify your email',
        text: `Please verify your email by visiting ${verifyUrl}`,
        html: `<p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`
      };
      // send and capture response
      sendgridResponse = await sgMail.send(msg);
    } else {
      // Log dev link - visible in console for demo
      console.log('DEV verification link:', verifyUrl);
    }

    return { verifyUrl, token, insertData, sendgridResponse };
  } catch (err) {
    // bubble up rich error for upper-level controller
    console.error('sendVerificationEmail error:', err.supabaseError || err);
    throw err;
  }
};
