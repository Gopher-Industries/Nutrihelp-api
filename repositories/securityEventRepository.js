const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function fetchAuthLogsBetween(fromIso, toIso) {
  try {
    const { data, error } = await supabase
      .from('auth_logs')
      .select('*')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load auth logs', error, { fromIso, toIso });
  }
}

async function fetchBruteForceLogsBetween(fromIso, toIso) {
  try {
    const { data, error } = await supabase
      .from('brute_force_logs')
      .select('*')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load brute force logs', error, { fromIso, toIso });
  }
}

async function fetchUserSessionsBetween(fromIso, toIso) {
  try {
    const { data, error } = await supabase
      .from('user_session')
      .select('*')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load user sessions', error, { fromIso, toIso });
  }
}

module.exports = {
  fetchAuthLogsBetween,
  fetchBruteForceLogsBetween,
  fetchUserSessionsBetween
};
