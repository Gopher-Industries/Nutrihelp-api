const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js')
const { sendVerificationEmail } = require('../utils/emailService'); 

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

exports.logLoginAttempt = async (req, res) => {
  const { email, user_id, success, ip_address, created_at } = req.body

  if (!email || success === undefined || !ip_address || !created_at) {
    return res.status(400).json({
      error: 'Missing required fields: email, success, ip_address, created_at',
    })
  }

  const { error } = await supabase.from('auth_logs').insert([
    {
      email,
      user_id: user_id || null,
      success,
      ip_address,
      created_at,
    },
  ])

  if (error) {
    console.error('❌ Failed to insert login log:', error)
    return res.status(500).json({ error: 'Failed to log login attempt' })
  }

  return res.status(201).json({ message: 'Login attempt logged successfully' })
}

exports.registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  // 1. Basic input validation
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 2. Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .single();

  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. Generate token & expiry
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hrs from now

  // 5. Insert new user
  const { error: insertError } = await supabase.from('users').insert([
    {
      email,
      password: hashedPassword,
      name,
      is_verified: false,
      verification_token: verificationToken,
      token_expiry: tokenExpiry,
    },
  ]);

  if (insertError) {
    console.error('❌ Error creating user:', insertError);
    return res.status(500).json({ error: 'Failed to register user' });
  }

  // 6. Send verification email
  await sendVerificationEmail(email, verificationToken);

  res.status(201).json({ message: 'User registered. Please check your email to verify your account.' });
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('verification_token', token)
    .single();

  if (error || !data) return res.status(400).json({ message: 'Invalid or expired token' });

  if (new Date(data.token_expiry) < new Date()) {
    return res.status(400).json({ message: 'Token expired' });
  }

  await supabase
    .from('users')
    .update({
      is_verified: true,
      verification_token: null,
      token_expiry: null
    })
    .eq('email', data.email);

  res.send('Email verified successfully! You can now log in.');
};
