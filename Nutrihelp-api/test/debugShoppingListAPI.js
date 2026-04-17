const supabase = require('../dbConnection.js');

async function debugShoppingListAPI() {
    console.log('🔍 Debugging Shopping List API Issues...\n');
    
    try {
        // 1. Check ingredient_price table (for getIngredientOptions API)
        console.log('1. 📊 Checking ingredient_price table...');
        try {
            const { data: ingredientPrices, error: ingredientError } = await supabase
                .from('ingredient_price')
                .select('*')
                .limit(3);
            
            if (ingredientError) {
                console.error('❌ ingredient_price table error:', ingredientError.message);
                console.log('   This explains the 500 error in getIngredientOptions API');
            } else if (ingredientPrices && ingredientPrices.length > 0) {
                console.log('✅ ingredient_price table exists with data:');
                ingredientPrices.forEach(item => {
                    console.log(`   - ID: ${item.id}, Product: ${item.product_name}, Price: $${item.price}`);
                });
            } else {
                console.log('⚠️ ingredient_price table exists but is empty');
            }
        } catch (error) {
            console.error('❌ Failed to access ingredient_price table:', error.message);
        }
        console.log();
        
        // 2. Check ingredients table
        console.log('2. 🥕 Checking ingredients table...');
        try {
            const { data: ingredients, error: ingredientsError } = await supabase
                .from('ingredients')
                .select('*')
                .limit(3);
            
            if (ingredientsError) {
                console.error('❌ ingredients table error:', ingredientsError.message);
            } else if (ingredients && ingredients.length > 0) {
                console.log('✅ ingredients table exists with data:');
                ingredients.forEach(item => {
                    console.log(`   - ID: ${item.id}, Name: ${item.name}, Category: ${item.category}`);
                });
            } else {
                console.log('⚠️ ingredients table exists but is empty');
            }
        } catch (error) {
            console.error('❌ Failed to access ingredients table:', error.message);
        }
        console.log();
        
        // 3. Check recipe_meal table (for generateFromMealPlan API)
        console.log('3. 🍽️ Checking recipe_meal table...');
        try {
            const { data: recipeMeals, error: recipeMealError } = await supabase
                .from('recipe_meal')
                .select('*')
                .limit(3);
            
            if (recipeMealError) {
                console.error('❌ recipe_meal table error:', recipeMealError.message);
                console.log('   This explains the 500 error in generateFromMealPlan API');
            } else if (recipeMeals && recipeMeals.length > 0) {
                console.log('✅ recipe_meal table exists with data:');
                recipeMeals.forEach(item => {
                    console.log(`   - Meal Plan ID: ${item.mealplan_id}, Recipe ID: ${item.recipe_id}`);
                });
            } else {
                console.log('⚠️ recipe_meal table exists but is empty');
            }
        } catch (error) {
            console.error('❌ Failed to access recipe_meal table:', error.message);
        }
        console.log();
        
        // 4. Check shopping_list_items table (for updateShoppingListItem API)
        console.log('4. 📝 Checking shopping_list_items table...');
        try {
            const { data: items, error: itemsError } = await supabase
                .from('shopping_list_items')
                .select('*')
                .limit(3);
            
            if (itemsError) {
                console.error('❌ shopping_list_items table error:', itemsError.message);
            } else if (items && items.length > 0) {
                console.log('✅ shopping_list_items table exists with data:');
                items.forEach(item => {
                    console.log(`   - ID: ${item.id}, List ID: ${item.shopping_list_id}, ${item.ingredient_name}`);
                });
            } else {
                console.log('⚠️ shopping_list_items table exists but is empty');
            }
        } catch (error) {
            console.error('❌ Failed to access shopping_list_items table:', error.message);
        }
        console.log();
        
        // 5. Check foreign key relationships
        console.log('5. 🔗 Checking foreign key relationships...');
        try {
            // Check foreign keys of ingredient_price table
            const { data: priceWithIngredients, error: priceError } = await supabase
                .from('ingredient_price')
                .select(`
                    id,
                    ingredient_id,
                    product_name,
                    ingredients!inner(name, category)
                `)
                .limit(1);
            
            if (priceError) {
                console.log('❌ Foreign key relationship issue in ingredient_price:', priceError.message);
            } else {
                console.log('✅ Foreign key relationships working correctly');
            }
        } catch (error) {
            console.log('❌ Error checking foreign keys:', error.message);
        }
        
        console.log('\n📋 Summary of Issues:');
        console.log('1. getIngredientOptions API (500): Likely missing ingredient_price table or data');
        console.log('2. updateShoppingListItem API (500): Likely missing shopping_list_items data');
        console.log('3. generateFromMealPlan API (500): Likely missing recipe_meal table or data');
        
        console.log('\n💡 Solutions:');
        console.log('1. Create missing tables if they don\'t exist');
        console.log('2. Insert sample data into empty tables');
        console.log('3. Check database permissions and schema');
        
    } catch (error) {
        console.error('💥 Error during debugging:', error);
    }
}

// Run debug if this file is executed directly
if (require.main === module) {
    debugShoppingListAPI()
        .then(() => {
            console.log('\n✅ Debugging completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Debugging failed:', error);
            process.exit(1);
        });
}

module.exports = { debugShoppingListAPI };
