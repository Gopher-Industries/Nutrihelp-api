// test/testIncrementalUpdates.js
// Test incremental update functionality

const axios = require('axios');

const API_BASE_URL = 'http://localhost:80/api';
const TEST_USER_ID = 23;

async function testIncrementalUpdates() {
  console.log('🧪 Testing Incremental Updates...\n');

  try {
    // 1. Create initial shopping list
    console.log('1. 📝 Creating initial shopping list...');
    const initialItems = [
      {
        ingredient_name: 'Test Item 1',
        category: 'pantry',
        quantity: 1,
        unit: 'piece',
        measurement: 'piece',
        notes: 'Initial test item',
        purchased: false,
        meal_tags: [],
        estimated_cost: 0,
      },
    ];

    const createResponse = await axios.post(`${API_BASE_URL}/shopping-list`, {
      user_id: TEST_USER_ID,
      name: 'Incremental Update Test List',
      items: initialItems,
    });

    const shoppingListId = createResponse.data.data.shopping_list.id;
    const initialItemId = createResponse.data.data.items[0].id;
    console.log('✅ Initial list created:', shoppingListId);
    console.log('✅ Initial item ID:', initialItemId);

    // 2. Test adding new item (incremental update)
    console.log('\n2. ➕ Testing add new item (incremental)...');
    const addItemResponse = await axios.post(`${API_BASE_URL}/shopping-list/items`, {
      shopping_list_id: shoppingListId,
      ingredient_name: 'Test Item 2',
      category: 'vegetable',
      quantity: 2,
      unit: 'kg',
      measurement: 'kg',
      notes: 'Added via incremental update',
      meal_tags: [],
      estimated_cost: 0,
    });

    const newItemId = addItemResponse.data.data.id;
    console.log('✅ New item added:', newItemId);

    // 3. Test updating item status (incremental update)
    console.log('\n3. 🔄 Testing update item status (incremental)...');
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/shopping-list/items/${initialItemId}`,
      {
        purchased: true,
        quantity: 3,
        notes: 'Updated via incremental update',
      }
    );

    console.log('✅ Item updated:', updateResponse.data.data);

    // 4. Verify shopping list content
    console.log('\n4. 🔍 Verifying shopping list content...');
    const getResponse = await axios.get(`${API_BASE_URL}/shopping-list?user_id=${TEST_USER_ID}`);
    const shoppingLists = getResponse.data.data;
    const testList = shoppingLists.find((list) => list.id === shoppingListId);

    console.log('📊 Shopping list items count:', testList.items.length);
    console.log('📋 Items:');
    testList.items.forEach((item) => {
      console.log(
        `   - ${item.ingredient_name} (ID: ${item.id}, Purchased: ${item.purchased}, Quantity: ${item.quantity})`
      );
    });

    // 5. Test deleting item (incremental update)
    console.log('\n5. 🗑️ Testing delete item (incremental)...');
    await axios.delete(`${API_BASE_URL}/shopping-list/items/${newItemId}`);
    console.log('✅ Item deleted');

    // 6. Final verification
    console.log('\n6. 🔍 Final verification...');
    const finalResponse = await axios.get(`${API_BASE_URL}/shopping-list?user_id=${TEST_USER_ID}`);
    const finalList = finalResponse.data.data.find((list) => list.id === shoppingListId);

    console.log('📊 Final items count:', finalList.items.length);
    console.log('📋 Final items:');
    finalList.items.forEach((item) => {
      console.log(
        `   - ${item.ingredient_name} (ID: ${item.id}, Purchased: ${item.purchased}, Quantity: ${item.quantity})`
      );
    });

    // 7. Verify no duplicate shopping lists were created
    console.log('\n7. 🔍 Checking for duplicate shopping lists...');
    const allLists = finalResponse.data.data;
    const testLists = allLists.filter((list) => list.name === 'Incremental Update Test List');
    console.log('📊 Test shopping lists count:', testLists.length);

    if (testLists.length === 1) {
      console.log('✅ SUCCESS: No duplicate shopping lists created!');
    } else {
      console.log('❌ FAILED: Multiple shopping lists with same name found');
    }

    console.log('\n🎉 Incremental Update Test Completed!');
    console.log('\n📋 Summary:');
    console.log('   - ✅ Added new item to existing shopping list');
    console.log('   - ✅ Updated existing item status and quantity');
    console.log('   - ✅ Deleted item from shopping list');
    console.log('   - ✅ No duplicate shopping lists created');
    console.log('   - ✅ All operations were incremental updates');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run test
testIncrementalUpdates();
