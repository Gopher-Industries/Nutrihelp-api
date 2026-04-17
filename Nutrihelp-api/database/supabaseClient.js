// database/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
 
// Backend should use SERVICE_ROLE_KEY for full admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL in .env');
}

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Using SUPABASE_ANON_KEY for Supabase. For full backend access, set SUPABASE_SERVICE_ROLE_KEY');
}
 
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});
 
module.exports = supabase;