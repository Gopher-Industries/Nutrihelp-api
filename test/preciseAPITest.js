const supabase = require('../dbConnection.js');

async function preciseAPITest() {
    console.log('🎯 Precise API Testing - Exact Query Simulation...\n');
    
    try {
        // Simulate exact query for getIngredientOptions API
        console.log('1. 🥕 Simulating getIngredientOptions API query exactly...');
        
        const name = 'Milk'; // Get from req.query.name
        
        console.log(`   Search term: "${name}"`);
        console.log('   Executing exact query from controller...');
        
        try {
            // This is the exact query from the controller
            const { data, error } = await supabase
                .from('ingredient_price')
                .select(`
                    id,
                    ingredient_id,
                    name,
                    unit,
                    measurement,
                    price,
                    store_id,
                    ingredients!inner(name, category)
                `)
                .ilike('ingredients.name', `%${name}%`)
                .order('price', { ascending: true });

            if (error) {
                console.log('   ❌ Query failed with error:', error);
                console.log('   📊 Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                
                // Try to diagnose the problem
                if (error.code === 'PGRST200') {
                    console.log('   💡 This is a foreign key relationship error');
                    console.log('   🔍 Checking if ingredients table exists and has correct structure...');
                    
                    // Check ingredients table
                    const { data: ingCheck, error: ingCheckError } = await supabase
                        .from('ingredients')
                        .select('id, name, category')
                        .limit(1);
                    
                    if (ingCheckError) {
                        console.log('   ❌ Ingredients table check failed:', ingCheckError.message);
                    } else {
                        console.log('   ✅ Ingredients table exists and accessible');
                        console.log('   📊 Sample ingredient:', ingCheck[0]);
                    }
                }
            } else {
                console.log('   ✅ Query successful!');
                console.log('   📊 Found data:', data.length, 'records');
                if (data.length > 0) {
                    console.log('   📋 Sample data structure:', JSON.stringify(data[0], null, 2));
                }
            }
        } catch (error) {
            console.log('   ❌ Query exception:', error.message);
            console.log('   🔍 Exception details:', error);
        }
        console.log();
        
        // Test 2: Check database connection status
        console.log('2. 🔌 Testing database connection...');
        try {
            const { data: testData, error: testError } = await supabase
                .from('ingredient_price')
                .select('id')
                .limit(1);
            
            if (testError) {
                console.log('   ❌ Database connection test failed:', testError.message);
            } else {
                console.log('   ✅ Database connection working');
                console.log('   📊 Connection test result:', testData.length, 'records');
            }
        } catch (error) {
            console.log('   ❌ Database connection exception:', error.message);
        }
        console.log();
        
        // Test 3: Check table permissions
        console.log('3. 🔐 Testing table permissions...');
        try {
            // Test SELECT permissions
            const { data: permData, error: permError } = await supabase
                .from('ingredient_price')
                .select('*')
                .limit(0);
            
            if (permError) {
                console.log('   ❌ SELECT permission test failed:', permError.message);
            } else {
                console.log('   ✅ SELECT permission working');
            }
        } catch (error) {
            console.log('   ❌ Permission test exception:', error.message);
        }
        
    } catch (error) {
        console.error('💥 Error during precise API testing:', error);
    }
}

// Run precise API test if this file is executed directly
if (require.main === module) {
    preciseAPITest()
        .then(() => {
            console.log('\n✅ Precise API testing completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Precise API testing failed:', error);
            process.exit(1);
        });
}

module.exports = { preciseAPITest };
