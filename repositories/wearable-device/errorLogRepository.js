let supabase = null;

try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
} catch {
  supabase = null;
}

function isAvailable() {
  return !!supabase;
}

async function insertErrorLog(dbEntry) {
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
}

async function checkConnection() {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase.from('error_logs').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

module.exports = {
  checkConnection,
  insertErrorLog,
  isAvailable
};
