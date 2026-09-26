// testSupabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCRUD() {
  // Insert test data
  let { data: testInsert, error } = await supabase
    .from('ingredients')
    .insert([{ name: 'Test Ingredient', calories: 100 }]);
  if (error) console.error('Insert Error:', error);
  else console.log('Inserted:', testInsert);

  // Query test data
  let { data: testQuery, error: queryError } = await supabase
    .from('ingredients')
    .select('*')
    .eq('name', 'Test Ingredient');
  if (queryError) console.error('Query Error:', queryError);
  else console.log('Queried:', testQuery);
}

testCRUD();
