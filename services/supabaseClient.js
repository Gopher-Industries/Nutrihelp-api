// Compatibility shim.
// Canonical Supabase configuration lives in database/supabase.js.

const {
  supabaseAnon,
  supabaseServiceRole,
} = require('../database/supabase');

function getSupabaseServiceClient() {
  return supabaseServiceRole;
}

module.exports = {
  supabaseAnon,
  supabaseService: supabaseServiceRole,
  getSupabaseServiceClient,
};