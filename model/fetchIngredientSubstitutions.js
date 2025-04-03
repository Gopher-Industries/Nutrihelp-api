const supabase = require("../dbConnection.js");

/**
 * Fetches substitution options for a given ingredient
 * @param {number} ingredientId - The ID of the ingredient to find substitutions for
 * @param {Object} options - Optional filtering parameters
 * @param {Array} options.allergies - Array of allergy IDs to exclude
 * @param {Array} options.dietaryRequirements - Array of dietary requirement IDs to filter by
 * @param {Array} options.healthConditions - Array of health condition IDs to consider
 * @returns {Promise<Object>} - Object containing original ingredient and array of substitute ingredients
 */
async function fetchIngredientSubstitutions(ingredientId, options = {}) {
    console.log(`Starting fetchIngredientSubstitutions with ingredientId: ${ingredientId} and options:`, JSON.stringify(options, null, 2));
    
    // Validate ingredientId
    if (!ingredientId) {
        console.error('Missing ingredientId parameter');
        throw new Error('Ingredient ID is required');
    }
    
    const parsedId = parseInt(ingredientId);
    if (isNaN(parsedId)) {
        console.error(`Invalid ingredientId: ${ingredientId} is not a number`);
        throw new Error('Invalid ingredient ID');
    }
    
    try {
        // First, get the original ingredient to know its category
        console.log(`Fetching original ingredient with ID: ${parsedId}`);
        let { data: originalIngredient, error: originalError } = await supabase
            .from('ingredients')
            .select('id, name, category')
            .eq('id', parsedId)
            .single();

        if (originalError) {
            console.error('Error fetching original ingredient:', originalError);
            throw new Error(`Database error: ${originalError.message}`);
        }

        if (!originalIngredient) {
            console.error(`Ingredient with ID ${parsedId} not found`);
            throw new Error('Ingredient not found');
        }

        console.log(`Found original ingredient: ${originalIngredient.name} (Category: ${originalIngredient.category})`);

        // Build the query for substitutes in the same category
        let query = supabase
            .from('ingredients')
            .select('id, name, category')
            .eq('category', originalIngredient.category)
            .neq('id', parsedId); // Exclude the original ingredient

        // Process allergies filter
        if (options.allergies && options.allergies.length > 0) {
            try {
                console.log(`Processing allergies filter: ${JSON.stringify(options.allergies)}`);
                
                // Validate that options.allergies contains valid IDs
                const validAllergyIds = options.allergies.filter(id => {
                    const parsed = parseInt(id);
                    return !isNaN(parsed);
                }).map(id => parseInt(id));
                
                if (validAllergyIds.length > 0) {
                    console.log(`Valid allergy IDs: ${JSON.stringify(validAllergyIds)}`);
                    
                    // Exclude ingredients with IDs matching the allergy IDs
                    // Using Supabase's filter method with notIn operator
                    query = query.filter('id', 'not.in', `(${validAllergyIds.join(',')})`);
                    console.log(`Applied allergy filter to exclude ingredients with IDs: ${JSON.stringify(validAllergyIds)}`);
                }
            } catch (allergyProcessingError) {
                console.error('Error processing allergies:', allergyProcessingError);
                // Continue with the query without applying this filter
            }
        }

        // Process dietary requirements filter
        if (options.dietaryRequirements && options.dietaryRequirements.length > 0) {
            try {
                console.log(`Processing dietary requirements filter: ${JSON.stringify(options.dietaryRequirements)}`);
                
                // Validate that options.dietaryRequirements contains valid IDs
                const validDietaryIds = options.dietaryRequirements.filter(id => {
                    const parsed = parseInt(id);
                    return !isNaN(parsed);
                }).map(id => parseInt(id));
                
                if (validDietaryIds.length > 0) {
                    console.log(`Valid dietary requirement IDs: ${JSON.stringify(validDietaryIds)}`);
                    
                    // Filter ingredients that meet the dietary requirements
                    // For now, we'll implement a simple filtering mechanism
                    // This is just a placeholder logic - in a real app, you'd query a junction table
                    
                    // For demonstration purposes, we'll use a simple approach where:
                    // - Ingredients with IDs divisible by (dietId+1) are suitable for that dietary requirement
                    // Instead of using complex expressions, we'll use individual filters for each ID
                    
                    // Create a separate query for each dietary requirement
                    let dietaryQuery = query;
                    
                    // Apply a simple filter based on ID patterns
                    // For example, if dietId is 2, we'll include ingredients with IDs divisible by 3
                    validDietaryIds.forEach(dietId => {
                        // We'll use a simple approach where ingredients with IDs in a certain range are suitable
                        // This is just for demonstration - in a real app, you'd use proper relationships
                        const suitableIds = [];
                        // Generate some suitable IDs based on a pattern
                        for (let i = 1; i <= 100; i++) {
                            if (i % (dietId + 1) === 0) {
                                suitableIds.push(i);
                            }
                        }
                        
                        if (suitableIds.length > 0) {
                            dietaryQuery = dietaryQuery.in('id', suitableIds);
                        }
                    });
                    
                    // Replace the original query with our filtered query
                    query = dietaryQuery;
                    
                    console.log('Applied dietary requirements filter');
                }
            } catch (dietaryProcessingError) {
                console.error('Error processing dietary requirements:', dietaryProcessingError);
                // Continue with the query without applying this filter
            }
        }

        // Process health conditions filter
        if (options.healthConditions && options.healthConditions.length > 0) {
            try {
                console.log(`Processing health conditions filter: ${JSON.stringify(options.healthConditions)}`);
                
                // Validate that options.healthConditions contains valid IDs
                const validHealthIds = options.healthConditions.filter(id => {
                    const parsed = parseInt(id);
                    return !isNaN(parsed);
                }).map(id => parseInt(id));
                
                if (validHealthIds.length > 0) {
                    console.log(`Valid health condition IDs: ${JSON.stringify(validHealthIds)}`);
                    
                    // Filter ingredients suitable for the specified health conditions
                    // For now, we'll implement a simple filtering mechanism similar to dietary requirements
                    // This is just a placeholder logic - in a real app, you'd query a junction table
                    
                    // For demonstration purposes, we'll use a simple approach where:
                    // - Ingredients with IDs divisible by (healthId+2) are suitable for that health condition
                    // Instead of using complex expressions, we'll use individual filters for each ID
                    
                    // Create a separate query for health conditions
                    let healthQuery = query;
                    
                    // Apply a simple filter based on ID patterns
                    validHealthIds.forEach(healthId => {
                        // We'll use a simple approach where ingredients with IDs in a certain range are suitable
                        // This is just for demonstration - in a real app, you'd use proper relationships
                        const suitableIds = [];
                        // Generate some suitable IDs based on a pattern
                        for (let i = 1; i <= 100; i++) {
                            if (i % (healthId + 2) === 0) {
                                suitableIds.push(i);
                            }
                        }
                        
                        if (suitableIds.length > 0) {
                            healthQuery = healthQuery.in('id', suitableIds);
                        }
                    });
                    
                    // Replace the original query with our filtered query
                    query = healthQuery;
                    
                    console.log('Applied health conditions filter');
                }
            } catch (healthProcessingError) {
                console.error('Error processing health conditions:', healthProcessingError);
                // Continue with the query without applying this filter
            }
        }

        // Execute the query
        console.log('Executing final query for substitutes');
        let { data, error } = await query.select('id, name, category');

        if (error) {
            console.error('Error fetching substitutes:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        const result = {
            original: originalIngredient,
            substitutes: data || []
        };
        
        console.log(`Found ${result.substitutes.length} substitutes for ${originalIngredient.name}`);
        return result;
    } catch (error) {
        console.error('Error in fetchIngredientSubstitutions:', error);
        throw error;
    }
}

module.exports = fetchIngredientSubstitutions;