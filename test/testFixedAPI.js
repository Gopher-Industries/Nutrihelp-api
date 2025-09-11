const axios = require('axios');
const { getOrCreateTestUserForShoppingList } = require('./test-helpers');

// Test configuration
const BASE_URL = 'http://localhost/api';
let TEST_USER_ID = null;
let SHOPPING_LIST_ID = null;
let SHOPPING_LIST_ITEM_ID = null;

async function testFixedAPIs() {
    console.log('🧪 Testing Fixed Shopping List APIs...\n');
    
    try {
        // Get or create test user
        console.log('👤 Getting or creating test user...');
        TEST_USER_ID = await getOrCreateTestUserForShoppingList();
        console.log(`📝 Using test user ID: ${TEST_USER_ID}\n`);
        
        // Test 1: getIngredientOptions API (fixed)
        console.log('1. 🥕 Testing Fixed Ingredient Options API...');
        try {
            const response = await axios.get(`${BASE_URL}/shopping-list/ingredient-options?name=Milk`);
            console.log('✅ Ingredient Options API working:', response.status);
            console.log('📊 Response data:', response.data);
        } catch (error) {
            console.log('❌ Ingredient Options API still failed:', error.response?.status, error.response?.data);
        }
        console.log();
        
        // Test 2: Create shopping list
        console.log('2. 🛒 Testing Create Shopping List API...');
        try {
            const testData = {
                user_id: TEST_USER_ID,
                name: 'Test Shopping List for Update',
                items: [
                    {
                        ingredient_name: 'Test Item for Update',
                        category: 'Test',
                        quantity: 100,
                        unit: 100,
                        measurement: 'g',
                        notes: 'Test note for update'
                    }
                ]
            };
            
            const response = await axios.post(`${BASE_URL}/shopping-list`, testData);
            console.log('✅ Create Shopping List API working:', response.status);
            SHOPPING_LIST_ID = response.data.data.shopping_list.id;
            SHOPPING_LIST_ITEM_ID = response.data.data.items[0].id;
            console.log(`📝 Created shopping list ID: ${SHOPPING_LIST_ID}, Item ID: ${SHOPPING_LIST_ITEM_ID}`);
        } catch (error) {
            console.log('❌ Create Shopping List API failed:', error.response?.status, error.response?.data);
        }
        console.log();
        
        // Test 3: updateShoppingListItem API (fixed)
        if (SHOPPING_LIST_ITEM_ID) {
            console.log('3. ✏️ Testing Fixed Update Shopping List Item API...');
            try {
                const updateData = {
                    purchased: true,
                    notes: 'Updated test note'
                };
                
                const response = await axios.patch(`${BASE_URL}/shopping-list/items/${SHOPPING_LIST_ITEM_ID}`, updateData);
                console.log('✅ Update Shopping List Item API working:', response.status);
                console.log('📊 Response data:', response.data);
            } catch (error) {
                console.log('❌ Update Shopping List Item API still failed:', error.response?.status, error.response?.data);
            }
        } else {
            console.log('3. ⚠️ Skipping update test - no item ID available');
        }
        console.log();
        
        // 测试4: generateFromMealPlan API (修复后) - 使用正确的用户ID
        console.log('4. 🍽️ Testing Fixed Generate from Meal Plan API...');
        try {
            const testData = {
                user_id: 23, // 使用实际有餐单数据的用户ID
                meal_plan_ids: [21, 22], // Using actual meal plan IDs from your database
                meal_types: ['breakfast', 'lunch']
            };
            
            const response = await axios.post(`${BASE_URL}/shopping-list/from-meal-plan`, testData);
            console.log('✅ Generate from Meal Plan API working:', response.status);
            console.log('📊 Response data:', response.data);
        } catch (error) {
            console.log('❌ Generate from Meal Plan API still failed:', error.response?.status, error.response?.data);
        }
        console.log();
        
        // 测试5: 获取购物清单
        console.log('5. 📋 Testing Get Shopping List API...');
        try {
            const response = await axios.get(`${BASE_URL}/shopping-list?user_id=${TEST_USER_ID}`);
            console.log('✅ Get Shopping List API working:', response.status);
            console.log(`📊 Found ${response.data.data.length} shopping lists`);
        } catch (error) {
            console.log('❌ Get Shopping List API failed:', error.response?.status, error.response?.data);
        }
        
        console.log('\n🎉 Fixed API Testing Completed!');
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
    }
}

// 运行测试如果直接执行此文件
if (require.main === module) {
    testFixedAPIs();
}

module.exports = { testFixedAPIs };
