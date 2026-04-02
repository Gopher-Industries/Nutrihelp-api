const supabase = require('../../dbConnection');

async function fetchAuthLogs(fromIso, toIso) {
  const { data, error } = await supabase
    .from('auth_logs')
    .select('*')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  return {
    data: data || [],
    error: error || null
  };
}

async function fetchBruteForceLogs(fromIso, toIso) {
  const { data, error } = await supabase
    .from('brute_force_logs')
    .select('*')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  return {
    data: data || [],
    error: error || null
  };
}

async function fetchUserSessions(fromIso, toIso) {
  const { data, error } = await supabase
    .from('user_session')
    .select('*')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  return {
    data: data || [],
    error: error || null
  };
}

module.exports = {
  fetchAuthLogs,
  fetchBruteForceLogs,
  fetchUserSessions
};
