const supabase = require('../dbConnection.js');

async function deepDebug() {
    console.log('🔍 Deep Debugging for SQL Query Issues...\n');
    
    try {
        // 1. Test complete query for getIngredientOptions
        console.log('1. 🥕 Testing getIngredientOptions complete query...');
        
        const testName = 'Milk';
        console.log(`   Testing with search term: "${testName}"`);
        
        try {
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
                .ilike('ingredients.name', `%${testName}%`)
                .order('price', { ascending: true });

            if (error) {
                console.log('   ❌ Query failed with error:', error);
                console.log('   📊 Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
            } else {
                console.log('   ✅ Query successful!');
                console.log('   📊 Found data:', data.length, 'records');
                if (data.length > 0) {
                    console.log('   📋 Sample data structure:', JSON.stringify(data[0], null, 2));
                }
            }
        } catch (error) {
            console.log('   ❌ Query exception:', error.message);
        }
        console.log();
        
        // 2. Test complete query for generateFromMealPlan
        console.log('2. 🍽️ Testing generateFromMealPlan complete query...');
        
        const testUserId = 225;
        const testMealPlanIds = [21, 22];
        
        console.log(`   Testing with user_id: ${testUserId}, meal_plan_ids: [${testMealPlanIds.join(', ')}]`);
        
        try {
            const { data: mealPlanData, error: mealPlanError } = await supabase
                .from('recipe_meal')
                .select(`
                    mealplan_id,
                    recipe_id,
                    meal_type,
                    recipe_id!inner(
                        recipe_ingredients!inner(
                            ingredient_id,
                            quantity,
                            measurement,
                            ingredients!inner(name, category)
                        )
                    )
                `)
                .in('mealplan_id', testMealPlanIds)
                .eq('user_id', testUserId);

            if (mealPlanError) {
                console.log('   ❌ Query failed with error:', mealPlanError);
                console.log('   📊 Error details:', {
                    message: mealPlanError.message,
                    details: mealPlanError.details,
                    hint: mealPlanError.hint,
                    code: mealPlanError.code
                });
            } else {
                console.log('   ✅ Query successful!');
                console.log('   📊 Found data:', mealPlanData.length, 'records');
                if (mealPlanData.length > 0) {
                    console.log('   📋 Sample data structure:', JSON.stringify(mealPlanData[0], null, 2));
                }
            }
        } catch (error) {
            console.log('   ❌ Query exception:', error.message);
        }
        console.log();
        
        // 3. Test simplified queries to isolate the problem
        console.log('3. 🔧 Testing simplified queries to isolate issues...');
        
        // Test 3a: Simple ingredient_price query
        console.log('   Testing simple ingredient_price query...');
        try {
            const { data: simpleData, error: simpleError } = await supabase
                .from('ingredient_price')
                .select('id, ingredient_id, name, price')
                .limit(1);
            
            if (simpleError) {
                console.log('   ❌ Simple query failed:', simpleError.message);
            } else {
                console.log('   ✅ Simple query successful, found:', simpleData.length, 'records');
            }
        } catch (error) {
            console.log('   ❌ Simple query exception:', error.message);
        }
        
        // Test 3b: Simple ingredients query
        console.log('   Testing simple ingredients query...');
        try {
            const { data: ingData, error: ingError } = await supabase
                .from('ingredients')
                .select('id, name, category')
                .limit(1);
            
            if (ingError) {
                console.log('   ❌ Ingredients query failed:', ingError.message);
            } else {
                console.log('   ✅ Ingredients query successful, found:', ingData.length, 'records');
            }
        } catch (error) {
            console.log('   ❌ Ingredients query exception:', error.message);
        }
        
        // Test 3c: Test foreign key relationships
        console.log('   Testing foreign key relationship...');
        try {
            const { data: relData, error: relError } = await supabase
                .from('ingredient_price')
                .select(`
                    id,
                    ingredient_id,
                    ingredients(id, name, category)
                `)
                .limit(1);
            
            if (relError) {
                console.log('   ❌ Relationship query failed:', relError.message);
            } else {
                console.log('   ✅ Relationship query successful');
                if (relData.length > 0) {
                    console.log('   📊 Sample relationship:', relData[0]);
                }
            }
        } catch (error) {
            console.log('   ❌ Relationship query exception:', error.message);
        }
        
        // 4. Provide fix suggestions
        console.log('\n4. 💡 Fix Recommendations:');
        console.log('   Based on the errors above, we can:');
        console.log('   1. Fix the JOIN syntax if it\'s incorrect');
        console.log('   2. Use separate queries instead of complex JOINs');
        console.log('   3. Check if all required tables and columns exist');
        
    } catch (error) {
        console.error('💥 Error during deep debugging:', error);
    }
}

// Run deep debug if this file is executed directly
if (require.main === module) {
    deepDebug()
        .then(() => {
            console.log('\n✅ Deep debugging completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Deep debugging failed:', error);
            process.exit(1);
        });
}

module.exports = { deepDebug };
