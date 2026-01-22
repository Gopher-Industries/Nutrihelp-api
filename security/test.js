// security/test.js
const SecurityAssessmentRunner = require('./runAssessment');
const errorLogService = require('../services/errorLogService');

async function testSecuritySystem() {
  console.log('🧪 Testing Security Assessment System...\n');
  
  try {
    // 1. Test the error log service
    console.log('1. Testing Error Logging Service...');
    const testError = new Error('Test error for logging');
    testError.code = 'TEST_ERROR';
    
    await errorLogService.logError({
      error: testError,
      category: 'info',
      type: 'system',
      additionalContext: {
        test: true,
        component: 'security_test'
      }
    });
    console.log('   ✅ Error logging test passed\n');
    
    // 2. Test security assessment
    console.log('2. Running Security Assessment...');
    const runner = new SecurityAssessmentRunner();
    const results = await runner.run();
    console.log('   ✅ Security assessment completed\n');
    
    console.log('🎉 All tests passed!');
    return results;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// If this script is run directly
if (require.main === module) {
  testSecuritySystem();
}

module.exports = testSecuritySystem;