const supabase = require('../dbConnection.js');

async function enhancedDebug() {
    console.log('🔍 Enhanced Debugging for Remaining API Issues...\n');
    
    try {
        // 1. 详细测试 getIngredientOptions 查询
        console.log('1. 🥕 Testing getIngredientOptions query step by step...');
        
        // 测试1: 基本查询
        console.log('   Testing basic ingredient_price query...');
        try {
            const { data: basicData, error: basicError } = await supabase
                .from('ingredient_price')
                .select('id, ingredient_id, name, unit, measurement, price, store_id')
                .limit(1);
            
            if (basicError) {
                console.log('   ❌ Basic query failed:', basicError.message);
            } else {
                console.log('   ✅ Basic query successful, found:', basicData.length, 'records');
            }
        } catch (error) {
            console.log('   ❌ Basic query exception:', error.message);
        }
        
        // 测试2: 带JOIN的查询
        console.log('   Testing JOIN query with ingredients table...');
        try {
            const { data: joinData, error: joinError } = await supabase
                .from('ingredient_price')
                .select(`
                    id,
                    ingredient_id,
                    name,
                    unit,
                    measurement,
                    price,
                    store_id,
                    ingredients!inner(name as ingredient_name, category)
                `)
                .limit(1);
            
            if (joinError) {
                console.log('   ❌ JOIN query failed:', joinError.message);
                console.log('   💡 This explains the getIngredientOptions API failure');
            } else {
                console.log('   ✅ JOIN query successful, found:', joinData.length, 'records');
            }
        } catch (error) {
            console.log('   ❌ JOIN query exception:', error.message);
        }
        
        // 测试3: 搜索查询
        console.log('   Testing search query with ilike...');
        try {
            const { data: searchData, error: searchError } = await supabase
                .from('ingredient_price')
                .select(`
                    id,
                    ingredient_id,
                    name,
                    unit,
                    measurement,
                    price,
                    store_id,
                    ingredients!inner(name as ingredient_name, category)
                `)
                .ilike('ingredients.name', '%Milk%')
                .limit(1);
            
            if (searchError) {
                console.log('   ❌ Search query failed:', searchError.message);
            } else {
                console.log('   ✅ Search query successful, found:', searchData.length, 'records');
            }
        } catch (error) {
            console.log('   ❌ Search query exception:', error.message);
        }
        console.log();
        
        // 2. 详细测试 generateFromMealPlan 查询
        console.log('2. 🍽️ Testing generateFromMealPlan query step by step...');
        
        // 测试1: 基本 recipe_meal 查询
        console.log('   Testing basic recipe_meal query...');
        try {
            const { data: mealData, error: mealError } = await supabase
                .from('recipe_meal')
                .select('*')
                .limit(1);
            
            if (mealError) {
                console.log('   ❌ Basic recipe_meal query failed:', mealError.message);
            } else {
                console.log('   ✅ Basic recipe_meal query successful, found:', mealData.length, 'records');
                if (mealData.length > 0) {
                    console.log('   📊 Sample data:', mealData[0]);
                }
            }
        } catch (error) {
            console.log('   ❌ Basic recipe_meal query exception:', error.message);
        }
        
        // 测试2: 检查 recipe_meal 表结构
        console.log('   Checking recipe_meal table structure...');
        try {
            const { data: mealStructure, error: mealStructureError } = await supabase
                .from('recipe_meal')
                .select('*')
                .limit(0);
            
            if (mealStructureError) {
                console.log('   ❌ Structure check failed:', mealStructureError.message);
            } else {
                console.log('   ✅ Structure check successful');
            }
        } catch (error) {
            console.log('   ❌ Structure check exception:', error.message);
        }
        console.log();
        
        // 3. 检查外键关系
        console.log('3. 🔗 Testing foreign key relationships...');
        
        // 测试 ingredient_price -> ingredients 关系
        console.log('   Testing ingredient_price -> ingredients relationship...');
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
                    console.log('   📊 Sample relationship data:', relData[0]);
                }
            }
        } catch (error) {
            console.log('   ❌ Relationship query exception:', error.message);
        }
        console.log();
        
        // 4. 提供修复建议
        console.log('4. 💡 Fix Recommendations:');
        
        if (true) { // 总是显示建议
            console.log('   For getIngredientOptions API:');
            console.log('   - Check if ingredients table has the expected structure');
            console.log('   - Verify the JOIN syntax is correct for your Supabase version');
            console.log('   - Consider using a simpler query first');
            
            console.log('   For generateFromMealPlan API:');
            console.log('   - Check recipe_meal table structure');
            console.log('   - Verify mealplan_id and recipe_id columns exist');
            console.log('   - Ensure there are valid meal plan records');
        }
        
    } catch (error) {
        console.error('💥 Error during enhanced debugging:', error);
    }
}

// 运行增强调试如果直接执行此文件
if (require.main === module) {
    enhancedDebug()
        .then(() => {
            console.log('\n✅ Enhanced debugging completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Enhanced debugging failed:', error);
            process.exit(1);
        });
}

module.exports = { enhancedDebug };
