module.exports = { getSubstitutes };


const supabase = require("../dbConnection.js");

/**
 * Fetches substitution options for a given ingredient
 * @param {number} ingredientId - The ID of the ingredient to find substitutions for
 * @param {Object} options - Optional filtering parameters
 * @param {Array} options.allergies - Array of allergy IDs to exclude
 * @param {Array} options.dietaryRequirements - Array of dietary requirement IDs to filter by
 * @param {Array} options.healthConditions - Array of health condition IDs to consider
 * @returns {Promise<Array>} - Array of substitute ingredients with their details
 */
async function fetchIngredientSubstitutions(ingredientId, options = {}) {
    try {
        // First, get the original ingredient to know its category
        let { data: originalIngredient, error: originalError } = await supabase
            .from('ingredients')
            .select('id, name, category')
            .eq('id', ingredientId)
            .single();

        if (originalError) {
            throw originalError;
        }

        if (!originalIngredient) {
            throw new Error('Ingredient not found');
        }

        // Build the query for substitutes in the same category
        let query = supabase
            .from('ingredients')
            .select('id, name, category')
            .eq('category', originalIngredient.category)
            .neq('id', ingredientId); // Exclude the original ingredient

        // Apply filters based on options
        if (options.allergies && options.allergies.length > 0) {
            // Maps ingredients to allergies
            const { data: allergyIngredients } = await supabase
                .from('ingredient_allergies')
                .select('ingredient_id')
                .in('allergy_id', options.allergies);

            if (allergyIngredients && allergyIngredients.length > 0) {
                const allergyIngredientIds = allergyIngredients.map(item => item.ingredient_id);
                query = query.not('id', 'in', allergyIngredientIds);
            }
        }

        if (options.dietaryRequirements && options.dietaryRequirements.length > 0) {
            // Maps ingredients to dietary requirements
            const { data: dietaryIngredients } = await supabase
                .from('user_dietary_requirements')
                .select('ingredient_id')
                .in('dietary_requirement_id', options.dietaryRequirements);

            if (dietaryIngredients && dietaryIngredients.length > 0) {
                const dietaryIngredientIds = dietaryIngredients.map(item => item.ingredient_id);
                query = query.in('id', dietaryIngredientIds);
            }
        }

        if (options.healthConditions && options.healthConditions.length > 0) {
            // Maps ingredients to health conditions
            const { data: healthIngredients } = await supabase
                .from('user_health_conditions')
                .select('ingredient_id')
                .in('health_condition_id', options.healthConditions);

            if (healthIngredients && healthIngredients.length > 0) {
                const healthIngredientIds = healthIngredients.map(item => item.ingredient_id);
                query = query.in('id', healthIngredientIds);
            }
        }

        // Execute the query
        let { data, error } = await query;

        if (error) {
            throw error;
        }

        // Return the substitutes along with the original ingredient
        return {
            original: originalIngredient,
            substitutes: data || []
        };
    } catch (error) {
        throw error;
    }
}

module.exports = fetchIngredientSubstitutions;
