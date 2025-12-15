require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log("URL:", process.env.PERSONAL_SUPABASE_URL);   // TEMP DEBUG
console.log("KEY:", process.env.PERSONAL_SUPABASE_ANON_KEY); // TEMP DEBUG

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = supabase;
