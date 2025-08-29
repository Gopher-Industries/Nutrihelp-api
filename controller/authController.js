const { createClient } = require('@supabase/supabase-js');
const sendVerificationEmail = require('../new_utils/sendVerificationEmail');

// Create Supabase client for server-side usage (uses anon key by default).
// If you need service_role privileges, set process.env.SUPABASE_SERVICE_ROLE_KEY
// and create a separate client for elevated ops (do NOT commit service role to repo).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Log a login attempt to auth_logs table.
 * Body expected: { email, user_id, success, ip_address, created_at }
 */
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

    const { data, error } = await supabase.from('auth_logs').insert([
      {
        email,
        user_id: user_id || null,
        success,
        ip_address,
        created_at,
      },
    ]);

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

/**
 * Request email verification:
 * Expects { email } in body.
 * Will call new_utils/sendVerificationEmail(email) and return/log whatever it returns.
 */
exports.requestEmailVerification = async (req, res) => {
  console.log('[requestEmailVerification] called with body:', req.body);
  const { email } = req.body;
  if (!email) {
    console.warn('[requestEmailVerification] missing email in request body');
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const result = await sendVerificationEmail(email);
    console.log('[requestEmailVerification] sendVerificationEmail returned:', result);

    const verifyUrl = result?.verifyUrl || result?.verifyURL || result?.url || null;
    if (verifyUrl) {
      console.log('🔗 DEV EMAIL VERIFICATION LINK:', verifyUrl);
    } else {
      console.log('🔗 DEV EMAIL VERIFICATION LINK: (no URL returned by mailer)');
    }

    return res.status(200).json({
      message: `Verification email sent to ${email}`,
      verifyUrl: verifyUrl || undefined
    });
  } catch (err) {
    // IMPORTANT: print everything useful about the error
    console.error('❌ Error in requestEmailVerification: message=', err?.message);
    if (err?.stack) console.error(err.stack);
    // If it's a Supabase style error object passed through, print it
    if (err?.response) console.error('error.response:', err.response);
    if (err?.status) console.error('error.status:', err.status);
    if (err?.code) console.error('error.code:', err.code);
    // fallback print
    console.error('Full error (raw):', err);

    return res.status(500).json({ error: 'Internal server error' });
  }
};