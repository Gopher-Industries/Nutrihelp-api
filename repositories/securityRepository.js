const { createClient } = require('@supabase/supabase-js');
const { wrapRepositoryError } = require('./repositoryError');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function getLatestSecurityAssessment() {
  try {
    const { data, error } = await supabase
      .from('security_assessments')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load latest security assessment', error);
  }
}

async function getSecurityAssessmentHistory(limit, offset) {
  try {
    const { data, error } = await supabase
      .from('security_assessments')
      .select('id, timestamp, overall_score, risk_level, critical_issues, passed_checks, total_checks')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load security assessment history', error);
  }
}

async function getSecurityTrendData(fromIso) {
  try {
    const { data, error } = await supabase
      .from('security_assessments')
      .select('timestamp, overall_score, critical_issues, risk_level')
      .gte('timestamp', fromIso)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load security trend data', error, { fromIso });
  }
}

async function getErrorLogsSince(fromIso) {
  try {
    const { data, error } = await supabase
      .from('error_logs')
      .select('error_category, error_type, timestamp')
      .gte('timestamp', fromIso);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load error logs', error, { fromIso });
  }
}

module.exports = {
  getErrorLogsSince,
  getLatestSecurityAssessment,
  getSecurityAssessmentHistory,
  getSecurityTrendData
};
