const { supabaseAnon, supabaseService } = require('../../services/supabaseClient');

async function findUserIdByEmail(email) {
  const { data, error } = await supabaseAnon
    .from('users')
    .select('user_id')
    .eq('email', email)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function createUser(userData) {
  const { data, error } = await supabaseAnon
    .from('users')
    .insert(userData)
    .select('user_id, email, name')
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function findUserWithRoleByEmail(email) {
  const { data, error } = await supabaseAnon
    .from('users')
    .select(`
      user_id, email, password, name, role_id,
      account_status, email_verified,
      user_roles!inner(id, role_name)
    `)
    .eq('email', email)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function updateLastLogin(userId, lastLogin) {
  const { error } = await supabaseAnon
    .from('users')
    .update({ last_login: lastLogin })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

async function deactivateSessionsByUserId(userId) {
  const { error } = await supabaseService
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

async function createRefreshSession(sessionData) {
  const { error } = await supabaseService
    .from('user_sessiontoken')
    .insert(sessionData);

  if (error) {
    throw error;
  }
}

async function findActiveSessionsByLookupHash(lookupHash) {
  const { data, error } = await supabaseService
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

  return data || [];
}

async function findUserById(userId) {
  const { data, error } = await supabaseAnon
    .from('users')
    .select(`
      user_id,
      email,
      name,
      role_id,
      account_status
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function deactivateSessionById(sessionId) {
  const { error } = await supabaseService
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('id', sessionId);

  if (error) {
    throw error;
  }
}

async function deactivateSessionsByLookupHash(lookupHash) {
  const { error } = await supabaseService
    .from('user_sessiontoken')
    .update({ is_active: false })
    .eq('refresh_token_lookup', lookupHash);

  if (error) {
    throw error;
  }
}

async function insertAuthLog(logEntry) {
  const { error } = await supabaseAnon
    .from('auth_logs')
    .insert(logEntry);

  if (error) {
    throw error;
  }
}

async function deactivateExpiredSessions(referenceTime) {
  const { error } = await supabaseService
    .from('user_sessiontoken')
    .update({ is_active: false })
    .lt('expires_at', referenceTime);

  if (error) {
    throw error;
  }
}

module.exports = {
  createRefreshSession,
  createUser,
  deactivateExpiredSessions,
  deactivateSessionById,
  deactivateSessionsByLookupHash,
  deactivateSessionsByUserId,
  findActiveSessionsByLookupHash,
  findUserById,
  findUserIdByEmail,
  findUserWithRoleByEmail,
  insertAuthLog,
  updateLastLogin
};
