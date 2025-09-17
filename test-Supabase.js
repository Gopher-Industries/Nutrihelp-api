// testSupabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSecurityAssessmentsTable() {
  console.log('Testing security_assessments table...');

  try {
    // 1. Test query permissions
    console.log('\n1. Testing SELECT...');
    let { data: queryData, error: queryError } = await supabase
      .from('security_assessments')
      .select('*')
      .limit(1);
    
    if (queryError) {
      console.error('Query Error:', queryError);
    } else {
      console.log('Query successful, records found:', queryData.length);
    }

    // 2. Testing insert permissions
    console.log('\n2. Testing INSERT...');
    let { data: insertData, error: insertError } = await supabase
      .from('security_assessments')
      .insert([{
        timestamp: new Date().toISOString(),
        overall_score: 75,
        total_checks: 8,
        passed_checks: 6,
        failed_checks: 1,
        warnings: 1,
        critical_issues: 0,
        risk_level: 'low',
        detailed_results: { test: 'connection_test' }
      }]);
    
    if (insertError) {
      console.error('Insert Error:', insertError);
    } else {
      console.log('Insert successful:', insertData);
    }

  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testSecurityAssessmentsTable();