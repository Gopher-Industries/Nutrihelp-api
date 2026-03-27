const supabase = require('../dbConnection.js');

async function checkRecipeIngredientStructure() {
  console.log('🔍 Checking Recipe Ingredient Table Structure...\n');

  try {
    // 1. Check if recipe_ingredient table exists
    console.log('1. 📊 Checking if recipe_ingredient table exists...');
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('recipe_ingredient')
        .select('*')
        .limit(0);

      if (tableError) {
        console.log('   ❌ Table check failed:', tableError.message);
        console.log('   💡 This table might not exist or have different name');
      } else {
        console.log('   ✅ recipe_ingredient table exists and accessible');
      }
    } catch (error) {
      console.log('   ❌ Table check exception:', error.message);
    }
    console.log();

    // 2. Try to get table structure information
    console.log('2. 🏗️ Checking table structure...');
    try {
      const { data: structureData, error: structureError } = await supabase
        .from('recipe_ingredient')
        .select('*')
        .limit(1);

      if (structureError) {
        console.log('   ❌ Structure check failed:', structureError.message);
        console.log('   📊 Error details:', {
          code: structureError.code,
          message: structureError.message,
          details: structureError.details,
          hint: structureError.hint,
        });
      } else {
        console.log('   ✅ Structure check successful');
        if (structureData && structureData.length > 0) {
          console.log('   📋 Sample data structure:', JSON.stringify(structureData[0], null, 2));
        } else {
          console.log('   📋 Table exists but no data found');
        }
      }
    } catch (error) {
      console.log('   ❌ Structure check exception:', error.message);
    }
    console.log();

    // 3. Check possible table name variants
    console.log('3. 🔍 Checking for alternative table names...');
    const possibleTableNames = [
      'recipe_ingredients',
      'recipe_ingredient',
      'recipeingredient',
      'recipe_ingredient_items',
      'recipe_items',
    ];

    for (const tableName of possibleTableNames) {
      try {
        const { data: altData, error: altError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (!altError) {
          console.log(`   ✅ Found table: ${tableName}`);

          // Try to get the structure of this table
          const { data: altStructure, error: altStructureError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (!altStructureError && altStructure && altStructure.length > 0) {
            console.log(`   📋 ${tableName} structure:`, JSON.stringify(altStructure[0], null, 2));
          }
        }
      } catch (error) {
        // Ignore error, continue checking next
      }
    }
    console.log();

    // 4. Provide fix suggestions
    console.log('4. 💡 Fix Recommendations:');
    console.log('   Based on the findings above:');
    console.log('   1. Check if recipe_ingredient table exists');
    console.log(
      '   2. Verify the table has required columns (ingredient_id, quantity, measurement)'
    );
    console.log('   3. Update the controller to use the correct table name and structure');
    console.log("   4. Consider creating the missing table if it doesn't exist");
  } catch (error) {
    console.error('💥 Error during table structure check:', error);
  }
}

// Run table structure check if this file is executed directly
if (require.main === module) {
  checkRecipeIngredientStructure()
    .then(() => {
      console.log('\n✅ Recipe ingredient table structure check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Recipe ingredient table structure check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkRecipeIngredientStructure };
