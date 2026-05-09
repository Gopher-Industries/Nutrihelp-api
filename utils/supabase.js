/**
 * Minimal Supabase client wrapper.
 * Expects SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_KEY) in env.
 */
let client = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_KEY');
  client = createClient(url, key);
} catch (e) {
  client = null;
}
module.exports = client;
