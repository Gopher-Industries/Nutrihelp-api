const supabase = require('../database/supabaseClient');
const { wrapRepositoryError } = require('./repositoryError');

async function auditLogSampleExists() {
  try {
    const { data, error } = await supabase.from('audit_logs').select('id').limit(1);
    if (error) {
      throw error;
    }

    return (data || []).length > 0;
  } catch (error) {
    throw wrapRepositoryError('Failed to check dashboard health', error);
  }
}

async function getLoginKpi24h() {
  try {
    const { data, error } = await supabase.rpc('login_kpi_24h');
    if (error) {
      throw error;
    }

    return data?.[0] || {};
  } catch (error) {
    throw wrapRepositoryError('Failed to fetch login KPI', error);
  }
}

async function getLoginDaily(tz, lookbackDays) {
  try {
    const { data, error } = await supabase.rpc('login_daily', {
      tz,
      lookback_days: lookbackDays
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to fetch login daily data', error, { tz, lookbackDays });
  }
}

async function getLoginDau(tz, lookbackDays) {
  try {
    const { data, error } = await supabase.rpc('login_dau', {
      tz,
      lookback_days: lookbackDays
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to fetch login DAU data', error, { tz, lookbackDays });
  }
}

async function getTopFailingIps7d() {
  try {
    const { data, error } = await supabase.rpc('login_top_failing_ips_7d');
    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to fetch top failing IPs', error);
  }
}

async function getFailByDomain7d() {
  try {
    const { data, error } = await supabase.rpc('login_fail_by_domain_7d');
    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to fetch failed logins by domain', error);
  }
}

module.exports = {
  auditLogSampleExists,
  getFailByDomain7d,
  getLoginDaily,
  getLoginDau,
  getLoginKpi24h,
  getTopFailingIps7d
};
