/**
 * database/supabase.js
 *
 * Canonical Supabase client configuration — the single place where static
 * Supabase clients are created for this backend. Other modules should import
 * from here rather than calling createClient() themselves.
 *
 * Exports:
 *   - supabaseAnon         Static client using the ANON key. Respects Row Level
 *                          Security. Default client for normal backend work.
 *   - supabaseServiceRole  Static client using the SERVICE ROLE key. BYPASSES
 *                          RLS entirely — every query runs with full privileges.
 *                          May be null if the service-role key is not configured.
 *   - createUserClient()   Factory for a per-request client bound to one user's
 *                          JWT, so RLS runs AS that user.
 *
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY to be present in the environment
 * BEFORE this module is first required (load your .env at the app entry point,
 * above the first import that pulls this in).
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-side clients: never persist or auto-refresh sessions. There is no
// browser and no user session to keep — this is the documented server config.
const SERVER_AUTH_OPTIONS = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

// --- Anon client: REQUIRED --------------------------------------------------
// The backend cannot serve normal requests without it, so fail loud at boot
// with a clear message instead of surfacing a cryptic error later.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[supabase] SUPABASE_URL and SUPABASE_ANON_KEY are required.'
  );
}

const supabaseAnon = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SERVER_AUTH_OPTIONS
);

// --- Service-role client: OPTIONAL ------------------------------------------
// Left as null when unconfigured so existing logging/security services, which
// already null-check getSupabaseServiceClient(), keep degrading gracefully
// instead of crashing in environments that intentionally omit the key.
let supabaseServiceRole = null;

if (SUPABASE_SERVICE_ROLE_KEY) {
  supabaseServiceRole = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SERVER_AUTH_OPTIONS
  );
} else {
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY missing — privileged Supabase operations are disabled.'
  );
}

/**
 * Create a request/user-specific Supabase client.
 *
 * Use this only when the current user's JWT must be passed to Supabase so that
 * Row Level Security runs as that user. Returns a NEW client on every call.
 *
 * Do NOT cache, memoize, or reuse this client across requests or users —
 * doing so would leak one user's auth context into another user's request.
 *
 * @param {string} accessToken - The authenticated user's Supabase JWT.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createUserClient(accessToken) {
  if (!accessToken) {
    // Reject an empty token loudly: otherwise this would silently return an
    // anon-level client while the caller believes it is user-scoped.
    throw new Error(
      '[supabase] accessToken is required to create a user-scoped client.'
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      ...SERVER_AUTH_OPTIONS,
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

module.exports = {
  supabaseAnon,
  supabaseServiceRole,
  createUserClient,

  // Temporary backwards-compatible aliases
  supabase: supabaseAnon,
  supabaseAdmin: supabaseServiceRole,
};