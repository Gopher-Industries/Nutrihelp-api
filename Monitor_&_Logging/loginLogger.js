const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function logLoginEvent({ userId, eventType, ip, userAgent, details = {} }) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      event_type: eventType,
      ip_address: ip,
      user_agent: userAgent,
      details
    });

  if (error) {
    console.error('Error logging login event:', error);
  }
}

module.exports = logLoginEvent;
