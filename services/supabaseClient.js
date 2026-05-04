const { createClient } = require('@supabase/supabase-js');

const supabaseAnon = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

const supabaseService = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (!supabaseAnon) console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_ANON_KEY missing.');
if (!supabaseService) console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');

// Lazy getter used by CT-004 log services — returns the service-role client or null.
function getSupabaseServiceClient() {
  return supabaseService;
}

module.exports = {
  supabaseAnon,
  supabaseService,
  getSupabaseServiceClient
};
