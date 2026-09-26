const supabase = require('../dbConnection.js');

async function checkDatabaseStatus() {
    console.log('🔍 Checking database status...\n');
    
    try {
        // Check if we can connect to the database
        console.log('1. Testing database connection...');
        const { data: connectionTest, error: connectionError } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (connectionError) {
            console.error('❌ Database connection failed:', connectionError);
            return;
        }
        console.log('✅ Database connection successful\n');
        
        // Check users table
        console.log('2. Checking users table...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('user_id, name, email, registration_date')
            .order('user_id', { ascending: true })
            .limit(10);
        
        if (usersError) {
            console.error('❌ Failed to query users table:', usersError);
            return;
        }
        
        if (users && users.length > 0) {
            console.log(`✅ Found ${users.length} users in database:`);
            users.forEach(user => {
                console.log(`   - ID: ${user.user_id}, Name: ${user.name}, Email: ${user.email}`);
            });
        } else {
            console.log('⚠️ No users found in database');
        }
        console.log();
        
        // Check shopping_lists table structure (if it exists)
        console.log('3. Checking shopping_lists table...');
        try {
            const { data: shoppingLists, error: shoppingError } = await supabase
                .from('shopping_lists')
                .select('count')
                .limit(1);
            
            if (shoppingError) {
                console.log('⚠️ shopping_lists table query failed (table might not exist):', shoppingError.message);
            } else {
                console.log('✅ shopping_lists table exists and is accessible');
            }
        } catch (error) {
            console.log('⚠️ shopping_lists table might not exist or have different structure');
        }
        console.log();
        
        // Check if user_id=1 exists specifically
        console.log('4. Checking for user_id=1 specifically...');
        const { data: specificUser, error: specificError } = await supabase
            .from('users')
            .select('user_id, name, email')
            .eq('user_id', 1)
            .single();
        
        if (specificError) {
            if (specificError.code === 'PGRST116') {
                console.log('❌ User with user_id=1 does not exist - this explains the foreign key constraint violation!');
                console.log('💡 Solution: Create a user first, or use an existing user ID');
            } else {
                console.log('❌ Error checking for user_id=1:', specificError);
            }
        } else {
            console.log('✅ User with user_id=1 exists:', specificUser);
        }
        console.log();
        
        // Provide recommendations
        console.log('📋 Recommendations:');
        console.log('1. If you need to test with a specific user ID, first create that user');
        console.log('2. Use the getOrCreateTestUserForShoppingList() helper function for tests');
        console.log('3. Check your database schema to ensure foreign key constraints are properly set up');
        console.log('4. Verify that the users table has the correct primary key structure (user_id)');
        
    } catch (error) {
        console.error('💥 Unexpected error during database check:', error);
    }
}

// Run the check if this file is executed directly
if (require.main === module) {
    checkDatabaseStatus();
}

module.exports = { checkDatabaseStatus };
