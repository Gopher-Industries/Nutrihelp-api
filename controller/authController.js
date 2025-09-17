// controllers/authController.js
const { createClient } = require('@supabase/supabase-js');
const sendVerificationEmail = require('../new_utils/sendVerificationEmail');

// ── Supabase clients ───────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 用 service-role 做 token 驗證更新（避免 RLS）
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// 開機時打 log，方便你confirm係新程式
console.log('[authController] loaded. SRK set =', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Handlers ──────────────────────────────────────────────────────────────────
exports.logLoginAttempt = async (req, res) => {
  try {
    console.log('[logLoginAttempt] payload:', req.body);
    const { email, user_id, success, ip_address, created_at } = req.body;

    if (!email || typeof success === 'undefined' || !ip_address || !created_at) {
      console.warn('[logLoginAttempt] missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: email, success, ip_address, created_at',
      });
    }

    const { data, error } = await supabase.from('auth_logs').insert([{
      email, user_id: user_id || null, success, ip_address, created_at,
    }]);

    if (error) {
      console.error('❌ [logLoginAttempt] Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to log login attempt', detail: error });
    }

    console.log('✅ [logLoginAttempt] logged:', data);
    return res.status(201).json({ message: 'Login attempt logged successfully', data });
  } catch (err) {
    console.error('❌ [logLoginAttempt] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err && err.message });
  }
};

exports.requestEmailVerification = async (req, res) => {
  console.log('[requestEmailVerification] body:', req.body);
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const result = await sendVerificationEmail(email);
    console.log('[requestEmailVerification] mailer returned:', result);

    const verifyUrl = result?.verifyUrl || result?.verifyURL || result?.url || null;
    console.log('🔗 DEV VERIFY LINK:', verifyUrl || '(none)');

    return res.status(200).json({
      message: `Verification email sent to ${email}`,
      verifyUrl: verifyUrl || undefined,
    });
  } catch (err) {
    console.error('❌ [requestEmailVerification] error:', err?.message, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ★ Token-only 驗證（不改 users 表）
// GET /api/verify-email/:token
exports.verifyEmailToken = async (req, res) => {
  const { token } = req.params;
  const now = new Date().toISOString();
  console.log('[verifyEmailToken] start. token =', token);

  try {
    // 1) 讀 token 行
    const { data: row, error: findErr } = await admin
      .from('email_verification_tokens')
      .select('id, user_email, expires_at, verified_at')
      .eq('token', token)
      .single();

    console.log('[verifyEmailToken] row =', row, 'error =', findErr);

    if (findErr || !row) return res.status(400).send('Invalid or expired link');
    if (row.verified_at) return res.status(400).send('This link was already used');
    if (row.expires_at && new Date(row.expires_at) < new Date())
      return res.status(400).send('This link has expired');

    // 2) 設 verified_at（一次性）
    const { error: updErr } = await admin
      .from('email_verification_tokens')
      .update({ verified_at: now })
      .eq('id', row.id);

    if (updErr) {
      console.error('[verifyEmailToken] update error:', updErr);
      return res.status(500).send('Failed to verify token (DB update)');
    }

    console.log('✅ [verifyEmailToken] verified_at set for token id =', row.id);
    return res.status(200).send('Email verified successfully (token)');
  } catch (e) {
    console.error('❌ [verifyEmailToken] unexpected error:', e);
    return res.status(500).send('Unexpected error');
  }
};
