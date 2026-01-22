const supabase = require('../dbConnection.js');

async function checkActualTableStructure() {
    console.log('🔍 Checking Actual Table Structure...\n');
    
    try {
        // 1. Check actual column names of ingredient_price table
        console.log('1. 📊 Checking ingredient_price table actual structure...');
        try {
            const { data: priceData, error: priceError } = await supabase
                .from('ingredient_price')
                .select('*')
                .limit(1);
            
            if (priceError) {
                console.error('❌ Error querying ingredient_price:', priceError.message);
            } else if (priceData && priceData.length > 0) {
                console.log('✅ ingredient_price table actual columns:');
                const columns = Object.keys(priceData[0]);
                columns.forEach(col => {
                    console.log(`   - ${col}: ${typeof priceData[0][col]} = ${priceData[0][col]}`);
                });
            }
        } catch (error) {
            console.error('❌ Failed to access ingredient_price:', error.message);
        }
        console.log();
        
        // 2. Check actual column names of ingredients table
        console.log('2. 🥕 Checking ingredients table actual structure...');
        try {
            const { data: ingredientData, error: ingredientError } = await supabase
                .from('ingredients')
                .select('*')
                .limit(1);
            
            if (ingredientError) {
                console.error('❌ Error querying ingredients:', ingredientError.message);
            } else if (ingredientData && ingredientData.length > 0) {
                console.log('✅ ingredients table actual columns:');
                const columns = Object.keys(ingredientData[0]);
                columns.forEach(col => {
                    console.log(`   - ${col}: ${typeof ingredientData[0][col]} = ${ingredientData[0][col]}`);
                });
            }
        } catch (error) {
            console.error('❌ Failed to access ingredients:', error.message);
        }
        console.log();
        
        // 3. Try a simple query to understand the actual structure
        console.log('3. 🔍 Testing simple queries...');
        try {
            // Test basic query of ingredient_price table
            const { data: simplePrice, error: simplePriceError } = await supabase
                .from('ingredient_price')
                .select('id, ingredient_id')
                .limit(1);
            
            if (simplePriceError) {
                console.log('❌ Simple ingredient_price query failed:', simplePriceError.message);
            } else {
                console.log('✅ Simple ingredient_price query successful');
            }
            
            // Test basic query of ingredients table
            const { data: simpleIngredient, error: simpleIngredientError } = await supabase
                .from('ingredients')
                .select('id, name')
                .limit(1);
            
            if (simpleIngredientError) {
                console.log('❌ Simple ingredients query failed:', simpleIngredientError.message);
            } else {
                console.log('✅ Simple ingredients query successful');
            }
            
        } catch (error) {
            console.log('❌ Simple queries failed:', error.message);
        }
        
        console.log('\n📋 Analysis:');
        console.log('The issue is likely that the column names in your database tables');
        console.log('do not match what the code expects. We need to either:');
        console.log('1. Update the code to match your actual column names, or');
        console.log('2. Rename your database columns to match the code expectations');
        
    } catch (error) {
        console.error('💥 Error during structure check:', error);
    }
}

// Run check if this file is executed directly
if (require.main === module) {
    checkActualTableStructure()
        .then(() => {
            console.log('\n✅ Structure check completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Structure check failed:', error);
            process.exit(1);
        });
}

module.exports = { checkActualTableStructure };
