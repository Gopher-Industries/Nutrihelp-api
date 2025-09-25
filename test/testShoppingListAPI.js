const axios = require('axios');
const { getOrCreateTestUserForShoppingList } = require('./test-helpers');

// Test configuration
const BASE_URL = 'http://localhost/api';
let TEST_USER_ID = null; // Will be set dynamically

// Test functions
async function testIngredientOptions() {
    console.log('🧪 Testing Ingredient Options API...');
    try {
        const response = await axios.get(`${BASE_URL}/shopping-list/ingredient-options?name=Tomato`);
        console.log('✅ Ingredient Options API working:', response.status);
        console.log('📊 Response data:', response.data);
    } catch (error) {
        console.log('❌ Ingredient Options API failed:', error.response?.status, error.response?.data);
    }
}

async function testCreateShoppingList() {
    console.log('\n🧪 Testing Create Shopping List API...');
    try {
        const testData = {
            user_id: TEST_USER_ID,
            name: 'Test Shopping List',
            items: [
                {
                    ingredient_name: 'Test Ingredient',
                    category: 'Test',
                    quantity: 100,
                    unit: 100,
                    measurement: 'g',
                    notes: 'Test note'
                }
            ]
        };
        
        const response = await axios.post(`${BASE_URL}/shopping-list`, testData);
        console.log('✅ Create Shopping List API working:', response.status);
        console.log('📊 Response data:', response.data);
        return response.data.data.shopping_list.id;
    } catch (error) {
        console.log('❌ Create Shopping List API failed:', error.response?.status, error.response?.data);
        return null;
    }
}

async function testGetShoppingList() {
    console.log('\n🧪 Testing Get Shopping List API...');
    try {
        const response = await axios.get(`${BASE_URL}/shopping-list?user_id=${TEST_USER_ID}`);
        console.log('✅ Get Shopping List API working:', response.status);
        console.log('📊 Response data:', response.data);
    } catch (error) {
        console.log('❌ Get Shopping List API failed:', error.response?.status, error.response?.data);
    }
}

async function testUpdateShoppingListItem(itemId) {
    if (!itemId) {
        console.log('⚠️ Skipping update test - no item ID available');
        return;
    }
    
    console.log('\n🧪 Testing Update Shopping List Item API...');
    try {
        const updateData = {
            purchased: true,
            notes: 'Updated test note'
        };
        
        const response = await axios.patch(`${BASE_URL}/shopping-list/items/${itemId}`, updateData);
        console.log('✅ Update Shopping List Item API working:', response.status);
        console.log('📊 Response data:', response.data);
    } catch (error) {
        console.log('❌ Update Shopping List Item API failed:', error.response?.status, error.response?.data);
    }
}

async function testDeleteShoppingListItem(itemId) {
    if (!itemId) {
        console.log('⚠️ Skipping delete test - no item ID available');
        return;
    }
    
    console.log('\n🧪 Testing Delete Shopping List Item API...');
    try {
        const response = await axios.delete(`${BASE_URL}/shopping-list/items/${itemId}`);
        console.log('✅ Delete Shopping List Item API working:', response.status);
        console.log('📊 Response data:', response.data);
    } catch (error) {
        console.log('❌ Delete Shopping List Item API failed:', error.response?.status, error.response?.data);
    }
}

async function testGenerateFromMealPlan() {
    console.log('\n🧪 Testing Generate Shopping List from Meal Plan API...');
    try {
        const testData = {
            user_id: TEST_USER_ID,
            meal_plan_ids: [1, 2],
            meal_types: ['breakfast', 'lunch']
        };
        
        const response = await axios.post(`${BASE_URL}/shopping-list/from-meal-plan`, testData);
        console.log('✅ Generate from Meal Plan API working:', response.status);
        console.log('📊 Response data:', response.data);
    } catch (error) {
        console.log('❌ Generate from Meal Plan API failed:', error.response?.status, error.response?.data);
    }
}

// Main test function
async function runAllTests() {
    console.log('🚀 Starting Shopping List API Tests...\n');
    
    try {
        // Get or create test user first
        console.log('👤 Getting or creating test user...');
        TEST_USER_ID = await getOrCreateTestUserForShoppingList();
        console.log(`📝 Using test user ID: ${TEST_USER_ID}\n`);
        
        // Test basic CRUD operations
        await testIngredientOptions();
        const itemId = await testCreateShoppingList();
        await testGetShoppingList();
        await testUpdateShoppingListItem(itemId);
        await testDeleteShoppingListItem(itemId);
        
        // Test meal plan integration
        await testGenerateFromMealPlan();
        
        console.log('\n🎉 All tests completed!');
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests };
