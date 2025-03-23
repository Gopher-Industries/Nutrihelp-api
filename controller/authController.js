const { createClient } = require('@supabase/supabase-js')

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
