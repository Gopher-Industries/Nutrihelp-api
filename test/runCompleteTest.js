const { runAllTests } = require('./testShoppingListAPI');
const { verifyDataInsertion } = require('./verifyDataInsertion');
const { checkDatabaseStatus } = require('./checkDatabaseStatus');

async function runCompleteTest() {
    console.log('🚀 Starting Complete Shopping List API Test Suite...\n');
    
    try {
        // 步骤1：检查数据库状态
        console.log('='.repeat(60));
        console.log('STEP 1: Checking Database Status');
        console.log('='.repeat(60));
        await checkDatabaseStatus();
        
        // 等待一下让输出清晰
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 步骤2：运行购物清单API测试
        console.log('\n' + '='.repeat(60));
        console.log('STEP 2: Running Shopping List API Tests');
        console.log('='.repeat(60));
        await runAllTests();
        
        // 等待一下让API操作完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 步骤3：验证数据是否成功写入数据库
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

// 运行完整测试套件
if (require.main === module) {
    runCompleteTest();
}

module.exports = { runCompleteTest };
