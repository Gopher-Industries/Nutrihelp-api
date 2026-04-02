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

async function fetchAuditLogs(fromIso, toIso) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  return {
    data: data || [],
    error: error || null
  };
}

async function fetchErrorLogs(fromIso, toIso) {
  const { data, error } = await supabase
    .from('error_logs')
    .select('*')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  return {
    data: data || [],
    error: error || null
  };
}

async function fetchRbacViolationLogs(fromIso, toIso) {
  const { data, error } = await supabase
    .from('rbac_violation_logs')
    .select('*')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  return {
    data: data || [],
    error: error || null
  };
}

module.exports = {
  fetchAuditLogs,
  fetchAuthLogs,
  fetchBruteForceLogs,
  fetchErrorLogs,
  fetchRbacViolationLogs,
  fetchUserSessions
};
