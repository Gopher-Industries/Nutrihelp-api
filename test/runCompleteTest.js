const { runAllTests } = require('./testShoppingListAPI');
const { verifyDataInsertion } = require('./verifyDataInsertion');
const { checkDatabaseStatus } = require('./checkDatabaseStatus');

async function runCompleteTest() {
    console.log('🚀 Starting Complete Shopping List API Test Suite...\n');
    
    try {
        // Step 1: Check database status
        console.log('='.repeat(60));
        console.log('STEP 1: Checking Database Status');
        console.log('='.repeat(60));
        await checkDatabaseStatus();
        
        // Wait a moment for clear output
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 2: Run shopping list API tests
        console.log('\n' + '='.repeat(60));
        console.log('STEP 2: Running Shopping List API Tests');
        console.log('='.repeat(60));
        await runAllTests();
        
        // Wait a moment for API operations to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Verify data was successfully written to database
        console.log('\n' + '='.repeat(60));
        console.log('STEP 3: Verifying Data Insertion');
        console.log('='.repeat(60));
        await verifyDataInsertion();
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 COMPLETE TEST SUITE FINISHED SUCCESSFULLY! 🎉');
        console.log('='.repeat(60));
        console.log('\n📋 Summary:');
        console.log('✅ Database connection verified');
        console.log('✅ Shopping List API tests completed');
        console.log('✅ Data insertion verified');
        console.log('\n💡 Next steps:');
        console.log('   - Check the console output above for any warnings or errors');
        console.log('   - Review the data in your database');
        console.log('   - Run individual test scripts if you need to debug specific issues');
        
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('💥 TEST SUITE FAILED!');
        console.error('='.repeat(60));
        console.error('Error:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.error('   1. Check your database connection');
        console.error('   2. Ensure your API server is running');
        console.error('   3. Verify database schema and permissions');
        console.error('   4. Check the individual test outputs above');
        
        process.exit(1);
    }
}

// Run complete test suite
if (require.main === module) {
    runCompleteTest();
}

module.exports = { runCompleteTest };
