const supabase = require('../dbConnection.js');

async function testGenerateFromMealPlan() {
  console.log('🧪 Testing Generate From Meal Plan API Step by Step...\n');

  try {
    // Use actual existing user ID (seen from recipe_meal table data)
    const testUserId = 23; // Changed to actual existing user ID
    const testMealPlanIds = [21, 22];

    console.log(`📝 Test Parameters:`);
    console.log(`   User ID: ${testUserId} (changed from 225 to actual user)`);
    console.log(`   Meal Plan IDs: [${testMealPlanIds.join(', ')}]`);
    console.log();

    // Test 1: Basic recipe_meal query
    console.log('1. 🍽️ Testing basic recipe_meal query...');
    try {
      const { data: basicData, error: basicError } = await supabase
        .from('recipe_meal')
        .select('*')
        .in('mealplan_id', testMealPlanIds)
        .eq('user_id', testUserId);

      if (basicError) {
        console.log('   ❌ Basic query failed:', basicError.message);
      } else {
        console.log('   ✅ Basic query successful');
        console.log('   📊 Found data:', basicData.length, 'records');
        if (basicData.length > 0) {
          console.log('   📋 Sample data:', JSON.stringify(basicData[0], null, 2));
        }
      }
    } catch (error) {
      console.log('   ❌ Basic query exception:', error.message);
    }
    console.log();

    // Test 2: Check recipe_meal table structure
    console.log('2. 🏗️ Checking recipe_meal table structure...');
    try {
      const { data: structureData, error: structureError } = await supabase
        .from('recipe_meal')
        .select('*')
        .limit(1);

      if (structureError) {
        console.log('   ❌ Structure check failed:', structureError.message);
      } else {
        console.log('   ✅ Structure check successful');
        if (structureData && structureData.length > 0) {
          console.log('   📋 Table structure:', JSON.stringify(structureData[0], null, 2));
        }
      }
    } catch (error) {
      console.log('   ❌ Structure check exception:', error.message);
    }
    console.log();

    // Test 3: Simplified JOIN query
    console.log('3. 🔗 Testing simplified JOIN query...');
    try {
      const { data: joinData, error: joinError } = await supabase
        .from('recipe_meal')
        .select(
          `
                    mealplan_id,
                    recipe_id,
                    recipe_id!inner(
                        recipe_ingredient!inner(
                            ingredient_id,
                            quantity,
                            measurement
                        )
                    )
                `
        )
        .in('mealplan_id', testMealPlanIds)
        .eq('user_id', testUserId);

      if (joinError) {
        console.log('   ❌ JOIN query failed:', joinError.message);
        console.log('   📊 Error details:', {
          code: joinError.code,
          message: joinError.message,
          details: joinError.details,
          hint: joinError.hint,
        });
      } else {
        console.log('   ✅ JOIN query successful');
        console.log('   📊 Found data:', joinData.length, 'records');
        if (joinData.length > 0) {
          console.log('   📋 Sample JOIN data:', JSON.stringify(joinData[0], null, 2));
        }
      }
    } catch (error) {
      console.log('   ❌ JOIN query exception:', error.message);
    }
    console.log();

    // Test 4: Check recipes table
    console.log('4. 📖 Checking recipes table...');
    try {
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .limit(1);

      if (recipesError) {
        console.log('   ❌ Recipes table check failed:', recipesError.message);
      } else {
        console.log('   ✅ Recipes table accessible');
        if (recipesData && recipesData.length > 0) {
          console.log('   📋 Sample recipe:', JSON.stringify(recipesData[0], null, 2));
        }
      }
    } catch (error) {
      console.log('   ❌ Recipes table check exception:', error.message);
    }
  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testGenerateFromMealPlan()
    .then(() => {
      console.log('\n✅ Generate from Meal Plan testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Generate from Meal Plan testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testGenerateFromMealPlan };
