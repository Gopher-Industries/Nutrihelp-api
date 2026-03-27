const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function deactivateSessionsByUserId(userId) {
  try {
    const { error } = await supabase
      .from('user_sessiontoken')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to deactivate sessions by user', error, { userId });
  }
}

async function createRefreshSession(sessionData) {
  try {
    const { data, error } = await supabase
      .from('user_sessiontoken')
      .insert(sessionData)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create refresh session', error, {
      userId: sessionData?.user_id
    });
  }
}

async function findActiveRefreshSessionByLookup(lookupHash) {
  try {
    const { data, error } = await supabase
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

    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load refresh session', error, { lookupHash });
  }
}

async function deactivateSessionById(sessionId) {
  try {
    const { error } = await supabase
      .from('user_sessiontoken')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to deactivate session by id', error, { sessionId });
  }
}

async function deactivateSessionByLookup(lookupHash) {
  try {
    const { error } = await supabase
      .from('user_sessiontoken')
      .update({ is_active: false })
      .eq('refresh_token_lookup', lookupHash);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to deactivate session by lookup hash', error, { lookupHash });
  }
}

async function cleanupExpiredSessions(nowIso) {
  try {
    const { error } = await supabase
      .from('user_sessiontoken')
      .update({ is_active: false })
      .lt('expires_at', nowIso);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to cleanup expired sessions', error, { nowIso });
  }
}

module.exports = {
  cleanupExpiredSessions,
  createRefreshSession,
  deactivateSessionById,
  deactivateSessionByLookup,
  deactivateSessionsByUserId,
  findActiveRefreshSessionByLookup
};
