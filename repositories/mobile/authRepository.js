const { supabaseAnon, supabaseService } = require("../../services/supabaseClient");

async function findUserByEmailForRegistration(email) {
  const { data, error } = await supabaseAnon
    .from("users")
    .select("user_id")
    .eq("email", email)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function createUser(userPayload) {
  const { data, error } = await supabaseAnon
    .from("users")
    .insert(userPayload)
    .select("user_id, email, name")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function findUserByEmailForLogin(email) {
  const { data, error } = await supabaseAnon
    .from("users")
    .select(`
      user_id, email, password, name, role_id,
      account_status, email_verified,
      user_roles!inner(id, role_name)
    `)
    .eq("email", email)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function updateUserLastLogin(userId, timestamp) {
  const { error } = await supabaseAnon
    .from("users")
    .update({ last_login: timestamp })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function createRefreshSession(sessionPayload) {
  const { error } = await supabaseService
    .from("user_sessiontoken")
    .insert(sessionPayload);

  if (error) {
    throw error;
  }
}

async function findActiveRefreshSessionByLookupHash(lookupHash) {
  const { data, error } = await supabaseService
    .from("user_sessiontoken")
    .select(`
      id,
      user_id,
      refresh_token,
      refresh_token_lookup,
      expires_at,
      is_active
    `)
    .eq("refresh_token_lookup", lookupHash)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data[0] || null : null;
}

async function findUserByIdForSession(userId) {
  const { data, error } = await supabaseAnon
    .from("users")
    .select(`
      user_id,
      email,
      name,
      role_id,
      account_status,
      user_roles!inner(role_name)
    `)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function deactivateSessionById(sessionId) {
  const { error } = await supabaseService
    .from("user_sessiontoken")
    .update({ is_active: false })
    .eq("id", sessionId);

  if (error) {
    throw error;
  }
}

async function deactivateSessionByLookupHash(lookupHash) {
  const { error } = await supabaseService
    .from("user_sessiontoken")
    .update({ is_active: false })
    .eq("refresh_token_lookup", lookupHash);

  if (error) {
    throw error;
  }
}

async function deactivateSessionsByUserId(userId) {
  const { error } = await supabaseService
    .from("user_sessiontoken")
    .update({ is_active: false })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function insertAuthLog(logPayload) {
  const { error } = await supabaseAnon
    .from("auth_logs")
    .insert(logPayload);

  if (error) {
    throw error;
  }
}

async function deactivateExpiredSessions(timestamp) {
  const { error } = await supabaseService
    .from("user_sessiontoken")
    .update({ is_active: false })
    .lt("expires_at", timestamp);

  if (error) {
    throw error;
  }
}

module.exports = {
  createRefreshSession,
  createUser,
  deactivateExpiredSessions,
  deactivateSessionById,
  deactivateSessionByLookupHash,
  deactivateSessionsByUserId,
  findActiveRefreshSessionByLookupHash,
  findUserByEmailForLogin,
  findUserByEmailForRegistration,
  findUserByIdForSession,
  insertAuthLog,
  updateUserLastLogin,
};
