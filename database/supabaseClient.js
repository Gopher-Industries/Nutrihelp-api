// Compatibility shim.
// Canonical Supabase configuration lives in database/supabase.js.

const { supabaseAnon } = require('./supabase');

module.exports = supabaseAnon;