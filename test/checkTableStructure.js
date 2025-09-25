const supabase = require('../dbConnection.js');

async function checkTableStructure() {
    console.log('🔍 Checking database table structure...\n');
    
    try {
        // Check users table structure
        console.log('1. 📊 Checking users table structure...');
        try {
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .limit(1);
            
            if (usersError) {
                console.error('❌ Error querying users table:', usersError.message);
                console.log('   This might mean the table has different column names or structure');
            } else if (usersData && usersData.length > 0) {
                console.log('✅ Users table structure:');
                const columns = Object.keys(usersData[0]);
                columns.forEach(col => {
                    console.log(`   - ${col}: ${typeof usersData[0][col]}`);
                });
            } else {
                console.log('⚠️ Users table exists but is empty');
            }
        } catch (error) {
            console.error('❌ Failed to access users table:', error.message);
        }
        console.log();
        
        // Check shopping_lists table structure
        console.log('2. 🛒 Checking shopping_lists table structure...');
        try {
            const { data: listsData, error: listsError } = await supabase
                .from('shopping_lists')
                .select('*')
                .limit(1);
            
            if (listsError) {
                console.error('❌ Error querying shopping_lists table:', listsError.message);
            } else if (listsData && listsData.length > 0) {
                console.log('✅ Shopping_lists table structure:');
                const columns = Object.keys(listsData[0]);
                columns.forEach(col => {
                    console.log(`   - ${col}: ${typeof listsData[0][col]}`);
                });
            } else {
                console.log('⚠️ Shopping_lists table exists but is empty');
            }
        } catch (error) {
            console.error('❌ Failed to access shopping_lists table:', error.message);
        }
        console.log();
        
        // Check shopping_list_items table structure
        console.log('3. 📝 Checking shopping_list_items table structure...');
        try {
            const { data: itemsData, error: itemsError } = await supabase
                .from('shopping_list_items')
                .select('*')
                .limit(1);
            
            if (itemsError) {
                console.error('❌ Error querying shopping_list_items table:', itemsError.message);
            } else if (itemsData && itemsData.length > 0) {
                console.log('✅ Shopping_list_items table structure:');
                const columns = Object.keys(itemsData[0]);
                columns.forEach(col => {
                    console.log(`   - ${col}: ${typeof itemsData[0][col]}`);
                });
            } else {
                console.log('⚠️ Shopping_list_items table exists but is empty');
            }
        } catch (error) {
            console.error('❌ Failed to access shopping_list_items table:', error.message);
        }
        console.log();
        
        // Try to get table information (if possible)
        console.log('4. 🔍 Trying to get table information...');
        try {
            // Try a simple query to understand table structure
            const { data: sampleData, error: sampleError } = await supabase
                .from('users')
                .select('*')
                .limit(0);
            
            if (sampleError) {
                console.log('❌ Cannot get table schema:', sampleError.message);
            } else {
                console.log('✅ Table schema query successful');
            }
        } catch (error) {
            console.log('❌ Schema query failed:', error.message);
        }
        
        console.log('\n📋 Recommendations:');
        console.log('1. Check if your table columns have different names (e.g., user_id instead of id)');
        console.log('2. Verify the table structure in your Supabase dashboard');
        console.log('3. Update the test code to match your actual table structure');
        console.log('4. Consider running the SQL schema creation scripts if tables are missing');
        
    } catch (error) {
        console.error('💥 Error during table structure check:', error);
    }
}

// Run check if this file is executed directly
if (require.main === module) {
    checkTableStructure()
        .then(() => {
            console.log('\n✅ Table structure check completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Table structure check failed:', error);
            process.exit(1);
        });
}

module.exports = { checkTableStructure };
