// testErrorLogging.js
// Load .env: try multiple likely locations (script dir, project root, process.cwd())
const path = require('path');
const dotenv = require('dotenv');

const tryPaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(process.cwd(), '.env')
];

let loaded = false;
for (const p of tryPaths) {
  try {
    const result = dotenv.config({ path: p });
    if (result.parsed) {
      console.log(`Loaded .env from ${p}`);
      loaded = true;
      break;
    }
  } catch (e) {
    // ignore
  }
}

if (!loaded) {
  console.warn('Warning: .env not found in standard locations; relying on process.env');
}

// Delay requiring the service until after env is (attempted) loaded to avoid early Supabase client initialization errors
const errorLogService = require('./services/errorLogService');

async function testErrorLogging() {
  console.log('🧪 Testing Error Logging...');

  // Check if environment variables are loaded
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL not found in environment variables');
    return;
  }

  // Testing basic error logging
  const testError = new Error('Test error logging');
  testError.code = 'TEST_ERROR';
  
  try {
    await errorLogService.logError({
      error: testError,
      category: 'info',
      type: 'system'
    });
    
    console.log('✅ Basic error logging test passed');

    // Testing critical error alerting
    const criticalError = new Error('Critical test error');
    await errorLogService.logError({
      error: criticalError,
      category: 'critical',
      type: 'system'
    });
    
    console.log('✅ Critical error logging test passed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testErrorLogging();