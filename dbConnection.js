// dbConnection.js — compatibility shim.
require('dotenv').config();

// Canonical Supabase configuration lives in database/supabase.js.
//
// This module historically exposed a SERVICE-ROLE client and is imported by
// many controllers/models that assume a live client and do not null-check.
// It therefore requires the service-role client even though other optional
// logging/security services may tolerate a missing service-role configuration.

const {
  supabaseServiceRole,
} = require('./database/supabase');

if (!supabaseServiceRole) {
  throw new Error(
    '[dbConnection] SUPABASE_SERVICE_ROLE_KEY is required.'
  );
}

module.exports = supabaseServiceRole;