const supabase = require('../dbConnection.js');

async function verifyDataInsertion() {
    console.log('🔍 Verifying data insertion in database...\n');
    
    try {
        // 1. Check users table
        console.log('1. 📊 Checking users table...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('user_id, name, email, registration_date')
            .order('registration_date', { ascending: false })
            .limit(5);
        
        if (usersError) {
            console.error('❌ Failed to query users table:', usersError);
        } else if (users && users.length > 0) {
            console.log(`✅ Found ${users.length} users in database:`);
            users.forEach(user => {
                console.log(`   - ID: ${user.user_id}, Name: ${user.name}, Email: ${user.email}, Registered: ${user.registration_date}`);
            });
        } else {
            console.log('⚠️ No users found in database');
        }
        console.log();
        
        // 2. Check shopping lists table
        console.log('2. 🛒 Checking shopping_lists table...');
        const { data: shoppingLists, error: shoppingError } = await supabase
            .from('shopping_lists')
            .select('id, user_id, name, description, estimated_total_cost, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (shoppingError) {
            console.error('❌ Failed to query shopping_lists table:', shoppingError);
        } else if (shoppingLists && shoppingLists.length > 0) {
            console.log(`✅ Found ${shoppingLists.length} shopping lists in database:`);
            shoppingLists.forEach(list => {
                console.log(`   - ID: ${list.id}, User ID: ${list.user_id}, Name: ${list.name}, Cost: $${list.estimated_total_cost}, Created: ${list.created_at}`);
            });
        } else {
            console.log('⚠️ No shopping lists found in database');
        }
        console.log();
        
        // 3. Check shopping list items table
        console.log('3. 📝 Checking shopping_list_items table...');
        const { data: items, error: itemsError } = await supabase
            .from('shopping_list_items')
            .select('id, shopping_list_id, ingredient_name, category, quantity, unit, measurement, estimated_cost, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (itemsError) {
            console.error('❌ Failed to query shopping_list_items table:', itemsError);
        } else if (items && items.length > 0) {
            console.log(`✅ Found ${items.length} shopping list items in database:`);
            items.forEach(item => {
                console.log(`   - ID: ${item.id}, List ID: ${item.shopping_list_id}, ${item.ingredient_name} (${item.category}), Qty: ${item.quantity}${item.measurement}, Cost: $${item.estimated_cost}`);
            });
        } else {
            console.log('⚠️ No shopping list items found in database');
        }
        console.log();
        
        // 4. Check data relationships
        console.log('4. 🔗 Checking data relationships...');
        if (shoppingLists && shoppingLists.length > 0 && items && items.length > 0) {
            const listIds = shoppingLists.map(list => list.id);
            const itemListIds = items.map(item => item.shopping_list_id);
            
            const orphanedItems = itemListIds.filter(itemListId => !listIds.includes(itemListId));
            if (orphanedItems.length > 0) {
                console.log('⚠️ Found orphaned items (shopping_list_id not in shopping_lists):', orphanedItems);
            } else {
                console.log('✅ All shopping list items have valid shopping_list_id references');
            }
            
            const userIds = users.map(user => user.user_id);
            const orphanedLists = shoppingLists.filter(list => !userIds.includes(list.user_id));
            if (orphanedLists.length > 0) {
                console.log('⚠️ Found orphaned shopping lists (user_id not in users):', orphanedLists.map(l => l.id));
            } else {
                console.log('✅ All shopping lists have valid user_id references');
            }
        }
        console.log();
        
        // 5. Provide data summary
        console.log('5. 📋 Data Summary:');
        console.log(`   - Users: ${users ? users.length : 0}`);
        console.log(`   - Shopping Lists: ${shoppingLists ? shoppingLists.length : 0}`);
        console.log(`   - Shopping List Items: ${items ? items.length : 0}`);
        
        if (shoppingLists && shoppingLists.length > 0) {
            const totalCost = shoppingLists.reduce((sum, list) => sum + (list.estimated_total_cost || 0), 0);
            console.log(`   - Total Estimated Cost: $${totalCost.toFixed(2)}`);
        }
        
        // 6. Verify test data
        console.log('\n6. 🧪 Verifying test data...');
        const testUsers = users ? users.filter(user => user.email.includes('testuser')) : [];
        const testLists = shoppingLists ? shoppingLists.filter(list => list.name.includes('Test')) : [];
        
        if (testUsers.length > 0) {
            console.log(`✅ Found ${testUsers.length} test users`);
        }
        if (testLists.length > 0) {
            console.log(`✅ Found ${testLists.length} test shopping lists`);
        }
        
        console.log('\n🎉 Data verification completed!');
        
    } catch (error) {
        console.error('💥 Error during data verification:', error);
    }
}

// Run verification if this file is executed directly
if (require.main === module) {
    verifyDataInsertion()
        .then(() => {
            console.log('\n✅ Verification process completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Verification process failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyDataInsertion };
