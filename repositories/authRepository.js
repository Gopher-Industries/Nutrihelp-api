const { createClient } = require('@supabase/supabase-js');

function getAnonClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function createRefreshSession(sessionPayload) {
  const { error } = await getServiceClient()
    .from('user_sessiontoken')
    .insert(sessionPayload);

  if (error) {
    throw error;
  }
}

async function deactivateSessionById(sessionId) {
  const { error } = await getServiceClient()
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('id', sessionId);

  if (error) {
    throw error;
  }
}

async function deactivateSessionByLookupHash(lookupHash) {
  const { error } = await getServiceClient()
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('refresh_token_lookup', lookupHash);

  if (error) {
    throw error;
  }
}

async function deactivateSessionsByUserId(userId) {
  const { error } = await getServiceClient()
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

async function findActiveRefreshSessionByLookupHash(lookupHash) {
  const { data, error } = await getServiceClient()
    .from('user_sessiontoken')
    .select(`
      id,
      user_id,
      refresh_token,
      refresh_token_lookup,
      expires_at,
      is_active
    `)
    .eq('refresh_token_lookup', lookupHash)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

async function findUserByIdForSession(userId) {
  const { data, error } = await getAnonClient()
    .from('users')
    .select(`
      user_id,
      email,
      name,
      role_id,
      account_status,
      user_roles!inner(role_name)
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  createRefreshSession,
  deactivateSessionById,
  deactivateSessionByLookupHash,
  deactivateSessionsByUserId,
  findActiveRefreshSessionByLookupHash,
  findUserByIdForSession,
};
