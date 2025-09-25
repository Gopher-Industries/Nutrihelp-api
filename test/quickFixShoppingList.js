const supabase = require('../dbConnection.js');

async function quickFixShoppingList() {
    console.log('🔧 Quick Fix for Shopping List API Issues...\n');
    
    try {
        // 1. Check and create ingredients table
        console.log('1. 🥕 Checking/Creating ingredients table...');
        try {
            const { data: ingredients, error: ingredientsError } = await supabase
                .from('ingredients')
                .select('*')
                .limit(1);
            
            if (ingredientsError) {
                console.log('⚠️ ingredients table missing, creating...');
                // Note: We cannot create tables directly here, need to create manually in Supabase
                console.log('💡 Please create ingredients table manually in Supabase with:');
                console.log('   - id (SERIAL PRIMARY KEY)');
                console.log('   - name (VARCHAR)');
                console.log('   - category (VARCHAR)');
                console.log('   - created_at (TIMESTAMP)');
            } else {
                console.log('✅ ingredients table exists');
            }
        } catch (error) {
            console.log('⚠️ Cannot access ingredients table:', error.message);
        }
        console.log();
        
        // 2. Check and create ingredient_price table
        console.log('2. 📊 Checking/Creating ingredient_price table...');
        try {
            const { data: prices, error: pricesError } = await supabase
                .from('ingredient_price')
                .select('*')
                .limit(1);
            
            if (pricesError) {
                console.log('⚠️ ingredient_price table missing, creating...');
                console.log('💡 Please create ingredient_price table manually in Supabase with:');
                console.log('   - id (SERIAL PRIMARY KEY)');
                console.log('   - ingredient_id (INTEGER REFERENCES ingredients(id))');
                console.log('   - product_name (VARCHAR)');
                console.log('   - price (DECIMAL)');
                console.log('   - store (VARCHAR)');
                console.log('   - created_at (TIMESTAMP)');
            } else {
                console.log('✅ ingredient_price table exists');
            }
        } catch (error) {
            console.log('⚠️ Cannot access ingredient_price table:', error.message);
        }
        console.log();
        
        // 3. Check and create recipe_meal table
        console.log('3. 🍽️ Checking/Creating recipe_meal table...');
        try {
            const { data: meals, error: mealsError } = await supabase
                .from('recipe_meal')
                .select('*')
                .limit(1);
            
            if (mealsError) {
                console.log('⚠️ recipe_meal table missing, creating...');
                console.log('💡 Please create recipe_meal table manually in Supabase with:');
                console.log('   - id (SERIAL PRIMARY KEY)');
                console.log('   - mealplan_id (INTEGER)');
                console.log('   - recipe_id (INTEGER)');
                console.log('   - created_at (TIMESTAMP)');
            } else {
                console.log('✅ recipe_meal table exists');
            }
        } catch (error) {
            console.log('⚠️ Cannot access recipe_meal table:', error.message);
        }
        console.log();
        
        // 4. Check shopping_list_items data
        console.log('4. 📝 Checking shopping_list_items data...');
        try {
            const { data: items, error: itemsError } = await supabase
                .from('shopping_list_items')
                .select('*')
                .limit(5);
            
            if (itemsError) {
                console.log('❌ Error accessing shopping_list_items:', itemsError.message);
            } else if (items && items.length > 0) {
                console.log(`✅ Found ${items.length} shopping list items`);
                console.log('   This should fix the updateShoppingListItem API');
            } else {
                console.log('⚠️ shopping_list_items table is empty');
                console.log('💡 Need to create shopping list items first');
            }
        } catch (error) {
            console.log('❌ Cannot access shopping_list_items:', error.message);
        }
        console.log();
        
        // 5. Provide complete fix SQL
        console.log('5. 🔧 Complete Fix SQL Commands:');
        console.log('=====================================');
        console.log('-- Run these in your Supabase SQL Editor:');
        console.log('');
        console.log('-- 1. Create ingredients table');
        console.log(`CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
        console.log('');
        console.log('-- 2. Create ingredient_price table');
        console.log(`CREATE TABLE IF NOT EXISTS ingredient_price (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER REFERENCES ingredients(id),
    product_name VARCHAR(255) NOT NULL,
    package_size DECIMAL(10,2),
    unit VARCHAR(50),
    measurement VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    store VARCHAR(255),
    store_location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
        console.log('');
        console.log('-- 3. Create recipe_meal table');
        console.log(`CREATE TABLE IF NOT EXISTS recipe_meal (
    id SERIAL PRIMARY KEY,
    mealplan_id INTEGER,
    recipe_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
        console.log('');
        console.log('-- 4. Insert sample data');
        console.log(`INSERT INTO ingredients (name, category) VALUES
('Tomato', 'Vegetable'),
('Chicken Wings', 'Meat'),
('Cheese', 'Dairy'),
('Avocado', 'Fruit')
ON CONFLICT (name) DO NOTHING;`);
        console.log('');
        console.log(`INSERT INTO ingredient_price (ingredient_id, product_name, price, store) VALUES
(1, 'Fresh Tomatoes', 3.99, 'Local Market'),
(2, 'Chicken Wings Pack', 8.99, 'Supermarket'),
(3, 'Cheddar Cheese', 4.50, 'Dairy Store'),
(4, 'Ripe Avocados', 5.96, 'Fruit Market')
ON CONFLICT DO NOTHING;`);
        console.log('');
        console.log('-- 5. Insert sample recipe_meal data');
        console.log(`INSERT INTO recipe_meal (mealplan_id, recipe_id) VALUES
(1, 1),
(1, 2),
(2, 3)
ON CONFLICT DO NOTHING;`);
        console.log('=====================================');
        
        console.log('\n📋 Next Steps:');
        console.log('1. Run the debug script: node test/debugShoppingListAPI.js');
        console.log('2. Execute the SQL commands above in Supabase');
        console.log('3. Re-run the tests: node test/testShoppingListAPI.js');
        
    } catch (error) {
        console.error('💥 Error during quick fix:', error);
    }
}

// Run quick fix if this file is executed directly
if (require.main === module) {
    quickFixShoppingList()
        .then(() => {
            console.log('\n✅ Quick fix analysis completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Quick fix analysis failed:', error);
            process.exit(1);
        });
}

module.exports = { quickFixShoppingList };
