const { createClient } = require('@supabase/supabase-js');

function getAnonClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function getServiceClient() {
  // TODO(Supabase standardization): replace this local factory with the team's
  // named, server-only service-role client once that card is merged. Keep the
  // privilege level unchanged: session persistence requires the service role.
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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
  // TODO(schema): confirm/add a uniqueness constraint for refresh_token_lookup.
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
  // TODO(Supabase standardization): switch this to the team's named anon/RLS
  // client import. Do not silently promote this user lookup to service-role.
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
