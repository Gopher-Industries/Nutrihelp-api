const axios = require('axios');

async function simpleAPITest() {
    console.log('🧪 Simple API Test - Basic Functionality...\n');
    
    const BASE_URL = 'http://localhost/api';
    
    try {
        // Test 1: Most basic API call
        console.log('1. 🌐 Testing basic server response...');
        try {
            const response = await axios.get(`${BASE_URL}/shopping-list?user_id=225`);
            console.log('   ✅ Basic API call successful');
            console.log('   📊 Status:', response.status);
        } catch (error) {
            console.log('   ❌ Basic API call failed:', error.message);
            return;
        }
        console.log();
        
        // Test 2: Test ingredient-options endpoint
        console.log('2. 🥕 Testing ingredient-options endpoint...');
        console.log(`   URL: ${BASE_URL}/shopping-list/ingredient-options?name=Milk`);
        
        try {
            const response = await axios.get(`${BASE_URL}/shopping-list/ingredient-options?name=Milk`);
            console.log('   ✅ Ingredient options API working!');
            console.log('   📊 Status:', response.status);
            console.log('   📋 Response data:', response.data);
        } catch (error) {
            console.log('   ❌ Ingredient options API failed');
            if (error.response) {
                console.log('   📊 Status:', error.response.status);
                console.log('   📋 Error response:', error.response.data);
                
                // Check if it's a validation error
                if (error.response.status === 400) {
                    console.log('   💡 This might be a validation error');
                } else if (error.response.status === 500) {
                    console.log('   💡 This is a server error - check server logs');
                }
            } else {
                console.log('   ❌ No response received:', error.message);
            }
        }
        console.log();
        
        // Test 3: Check server status
        console.log('3. 🔍 Server status check...');
        console.log('   Base URL:', BASE_URL);
        console.log('   Note: Server should be running on port 80 (default)');
        console.log('   If using different port, update BASE_URL accordingly');
        
    } catch (error) {
        console.error('💥 Error during simple API testing:', error.message);
    }
}

// Run simple API test if this file is executed directly
if (require.main === module) {
    simpleAPITest()
        .then(() => {
            console.log('\n✅ Simple API testing completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Simple API testing failed:', error);
            process.exit(1);
        });
}

module.exports = { simpleAPITest };
