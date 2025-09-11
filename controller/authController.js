exports.logLoginAttempt = async (req, res) => {
  const { email, user_id, success, ip_address, created_at } = req.body;

  if (!email || success === undefined || !ip_address || !created_at) {
    return res.status(400).json({
      error: 'Missing required fields: email, success, ip_address, created_at',
    });
  }

  const { error } = await supabase.from('auth_logs').insert([
    {
      email,
      user_id: user_id || null,
      success,
      ip_address,
      created_at,
    },
  ]);

  if (error) {
    console.error('❌ Failed to insert login log:', error);
    return res.status(500).json({ error: 'Failed to log login attempt' });
  }

  return res.status(201).json({ message: 'Login attempt logged successfully' });
};

exports.sendSMSByEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('contact_number')
      .eq('email', email)
      .single();

    if (error || !data || !data.contact_number) {
      return res.status(404).json({ error: 'Phone number not found for the given email' });
    }

    const phone = data.contact_number;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`📨 Sending verification code ${verificationCode} to ${phone}`);

    return res.status(200).json({
      message: 'SMS code sent',
      phone,
    });
  } catch (err) {
    console.error('❌ Error sending SMS:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
