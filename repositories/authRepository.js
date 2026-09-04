const { supabaseAnon, supabaseServiceRole } = require('../database/supabase');

function getAnonClient() {
  return supabaseAnon;
}

function getServiceClient() {
  if (!supabaseServiceRole) {
    throw new Error(
      '[authRepository] SUPABASE_SERVICE_ROLE_KEY is required for session operations.'
    );
  }

  return supabaseServiceRole;
}

async function createRefreshSession(sessionPayload) {
  const { error } = await getServiceClient().from('user_sessiontoken').insert(sessionPayload);

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
  // maybeSingle deliberately fails if duplicate active lookup hashes exist.
  const { data, error } = await getServiceClient()
    .from('user_sessiontoken')
    .select(
      `
      id,
      user_id,
      refresh_token,
      refresh_token_lookup,
      expires_at,
      is_active
    `
    )
    .eq('refresh_token_lookup', lookupHash)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function findUserByIdForSession(userId) {
  // This user lookup intentionally uses the anon/RLS client, not the service-role client.
  const { data, error } = await getAnonClient()
    .from('users')
    .select(
      `
      user_id,
      email,
      name,
      role_id,
      account_status,
      user_roles!inner(role_name)
    `
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findActiveTrustedDevice(userId, lookupHash) {
  const { data, error } = await getServiceClient()
    .from('user_sessiontoken')
    .select('id, refresh_token, expires_at, is_active, device_info')
    .eq('user_id', userId)
    .eq('token_type', 'trusted_device')
    .eq('refresh_token_lookup', lookupHash)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findActiveTrustedDeviceIdsByUserId(userId) {
  const { data, error } = await getServiceClient()
    .from('user_sessiontoken')
    .select('id')
    .eq('user_id', userId)
    .eq('token_type', 'trusted_device')
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

async function deactivateActiveTrustedDeviceForFingerprint(userId, userAgentHash) {
  const { error } = await getServiceClient()
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('token_type', 'trusted_device')
    .eq('is_active', true)
    .contains('device_info', { userAgentHash });

  if (error) throw error;
}

async function deactivateTrustedDevicesByUserId(userId) {
  const { error } = await getServiceClient()
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('token_type', 'trusted_device');

  if (error) throw error;
}

async function deactivateExpiredSessions(expiredBefore) {
  const { error } = await getServiceClient()
    .from('user_sessiontoken')
    .update({ is_active: false })
    .lt('expires_at', expiredBefore);

  if (error) throw error;
}

module.exports = {
  createRefreshSession,
  deactivateSessionById,
  deactivateSessionByLookupHash,
  deactivateSessionsByUserId,
  findActiveRefreshSessionByLookupHash,
  findActiveTrustedDevice,
  findActiveTrustedDeviceIdsByUserId,
  findUserByIdForSession,
  deactivateActiveTrustedDeviceForFingerprint,
  deactivateTrustedDevicesByUserId,
  deactivateExpiredSessions,
};
