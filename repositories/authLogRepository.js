const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function countRecentBruteForceFailuresByEmail(email, sinceIso) {
  try {
    const { data, error } = await supabase
      .from('brute_force_logs')
      .select('id')
      .eq('email', email)
      .eq('success', false)
      .gte('created_at', sinceIso);

    if (error) {
      throw error;
    }

    return data?.length || 0;
  } catch (error) {
    throw wrapRepositoryError('Failed to count brute force failures', error, { email, sinceIso });
  }
}

async function insertBruteForceAttempt({ email, ipAddress = null, success, createdAt }) {
  try {
    const payload = {
      email,
      ip_address: ipAddress,
      success,
      created_at: createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('brute_force_logs')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to insert brute force attempt', error, { email });
  }
}

async function clearFailedBruteForceAttempts(email) {
  try {
    const { error } = await supabase
      .from('brute_force_logs')
      .delete()
      .eq('email', email)
      .eq('success', false);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to clear brute force attempts', error, { email });
  }
}

async function insertAuthAttempt({ userId = null, email, success, ipAddress = null, createdAt }) {
  try {
    const payload = {
      user_id: userId,
      email,
      success,
      ip_address: ipAddress,
      created_at: createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('auth_logs')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to insert auth attempt', error, { email, userId });
  }
}

module.exports = {
  clearFailedBruteForceAttempts,
  countRecentBruteForceFailuresByEmail,
  insertAuthAttempt,
  insertBruteForceAttempt
};
