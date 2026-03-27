const { createClient } = require('@supabase/supabase-js');
const { wrapRepositoryError } = require('./repositoryError');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function isAvailable() {
  return !!supabase;
}

async function canReadErrorLogs() {
  try {
    if (!supabase) {
      return false;
    }

    const { error } = await supabase.from('error_logs').select('id').limit(1);
    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to verify error log access', error);
  }
}

async function insertErrorLog(dbEntry) {
  try {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const { data, error } = await supabase
      .from('error_logs')
      .insert([dbEntry])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to insert error log', error);
  }
}

module.exports = {
  canReadErrorLogs,
  insertErrorLog,
  isAvailable
};
