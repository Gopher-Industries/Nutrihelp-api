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
    // Input validation
    if (!ingredientId) {
        const error = new Error('Ingredient ID is required');
        console.error('Missing ingredientId parameter');
        throw error;
    }
    
    const parsedId = parseInt(ingredientId);
    if (isNaN(parsedId)) {
        const error = new Error('Invalid ingredient ID');
        console.error(`Invalid ingredientId: ${ingredientId} is not a number`);
        throw error;
    }

    // Validate options object structure and ensure arrays are properly initialized
    // Handle allergies parameter
    if (options.allergies !== undefined) {
        if (!Array.isArray(options.allergies)) {
            console.error(`Invalid allergies format: ${typeof options.allergies}`);
            // Try to parse string if it's a comma-separated list
            if (typeof options.allergies === 'string') {
                try {
                    options.allergies = options.allergies.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                    console.log(`Parsed allergies from string: ${JSON.stringify(options.allergies)}`);
                } catch (parseError) {
                    console.error('Error parsing allergies string:', parseError);
                    options.allergies = [];
                }
            } else {
                // Convert to empty array for other non-array types
                options.allergies = [];
                console.log('Converted allergies to empty array');
            }
        } else {
            // Ensure all array elements are integers
            options.allergies = options.allergies.map(id => parseInt(id)).filter(id => !isNaN(id));
            console.log(`Validated allergies array: ${JSON.stringify(options.allergies)}`);
        }
    }

    // Handle dietary requirements parameter
    if (options.dietaryRequirements !== undefined) {
        if (!Array.isArray(options.dietaryRequirements)) {
            console.error(`Invalid dietary requirements format: ${typeof options.dietaryRequirements}`);
            // Try to parse string if it's a comma-separated list
            if (typeof options.dietaryRequirements === 'string') {
                try {
                    options.dietaryRequirements = options.dietaryRequirements.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                    console.log(`Parsed dietary requirements from string: ${JSON.stringify(options.dietaryRequirements)}`);
                } catch (parseError) {
                    console.error('Error parsing dietary requirements string:', parseError);
                    options.dietaryRequirements = [];
                }
            } else {
                // Convert to empty array for other non-array types
                options.dietaryRequirements = [];
                console.log('Converted dietary requirements to empty array');
            }
        } else {
            // Ensure all array elements are integers
            options.dietaryRequirements = options.dietaryRequirements.map(id => parseInt(id)).filter(id => !isNaN(id));
            console.log(`Validated dietary requirements array: ${JSON.stringify(options.dietaryRequirements)}`);
        }
    }

    // Handle health conditions parameter
    if (options.healthConditions !== undefined) {
        if (!Array.isArray(options.healthConditions)) {
            console.error(`Invalid health conditions format: ${typeof options.healthConditions}`);
            // Try to parse string if it's a comma-separated list
            if (typeof options.healthConditions === 'string') {
                try {
                    options.healthConditions = options.healthConditions.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                    console.log(`Parsed health conditions from string: ${JSON.stringify(options.healthConditions)}`);
                } catch (parseError) {
                    console.error('Error parsing health conditions string:', parseError);
                    options.healthConditions = [];
                }
            } else {
                // Convert to empty array for other non-array types
                options.healthConditions = [];
                console.log('Converted health conditions to empty array');
            }
        } else {
            // Ensure all array elements are integers
            options.healthConditions = options.healthConditions.map(id => parseInt(id)).filter(id => !isNaN(id));
            console.log(`Validated health conditions array: ${JSON.stringify(options.healthConditions)}`);
        }
    }
    
    try {
        // First, get the original ingredient to know its category
        console.log(`Fetching original ingredient with ID: ${parsedId}`);
        let { data: originalIngredient, error: originalError } = await supabase
            .from('ingredients_new')
            .select('ingredient_id, name, category')
            .eq('ingredient_id', parsedId)
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
            .from('ingredients_new')
            .select('ingredient_id, name, category, calories, fat, carbohydrates, protein, fiber, sodium, sugar')
            .eq('category', originalIngredient.category)
            .neq('ingredient_id', parsedId); // Exclude the original ingredient

        // Process allergies filter
        if (options.allergies && Array.isArray(options.allergies) && options.allergies.length > 0) {
            try {
                console.log(`Processing allergies filter with ${options.allergies.length} items`);
                
                // Ensure allergies is an array of numbers
                let validAllergyIds = [];
                if (Array.isArray(options.allergies)) {
                    validAllergyIds = options.allergies
                        .filter(id => !isNaN(parseInt(id)))
                        .map(id => parseInt(id));
                } else {
                    console.error('Allergies is not an array, this should not happen as controller should convert it');
                    // Fallback handling just in case
                    validAllergyIds = [];
                }
                
                console.log(`Valid allergy IDs: ${JSON.stringify(validAllergyIds)}`);
                
                if (validAllergyIds.length > 0) {
                    console.log(`Processing ${validAllergyIds.length} allergy IDs directly`);
                    // First, verify the allergies exist in the allergens_new table
                    const { data: allergenInfo, error: allergenError } = await supabase
                        .from('allergens_new')
                        .select('allergen_id, standard_name')
                        .in('allergen_id', validAllergyIds);
                        
                    if (allergenError) {
                        console.error('Error fetching allergen information:', allergenError);
                        throw new Error(`Database error: ${allergenError.message}`);
                    }
                    
                    console.log(`Found ${allergenInfo ? allergenInfo.length : 0} allergens`);
                    
                    if (allergenInfo && allergenInfo.length > 0) {
                        // Get all ingredients that contain these allergens using the ingredient_allergens mapping table
                        const { data: ingredientsWithAllergens, error: ingredientAllergenError } = await supabase
                            .from('ingredient_allergens')
                            .select('ingredient_id')
                            .in('allergen_id', validAllergyIds);
                            
                        if (ingredientAllergenError) {
                            console.error('Error fetching ingredients with allergens:', ingredientAllergenError);
                            throw new Error(`Database error: ${ingredientAllergenError.message}`);
                        }
                        
                        // Extract ingredient IDs to exclude
                        let ingredientsToExclude = [];
                        if (ingredientsWithAllergens && ingredientsWithAllergens.length > 0) {
                            ingredientsToExclude = ingredientsWithAllergens.map(item => item.ingredient_id);
                            // Remove duplicates
                            ingredientsToExclude = [...new Set(ingredientsToExclude)];
                            console.log(`Found ${ingredientsToExclude.length} ingredients to exclude due to allergens`);
                        }
                        
                        if (ingredientsToExclude.length > 0) {
                            console.log(`Excluding ${ingredientsToExclude.length} ingredients due to allergies`);
                            query = query.not('ingredient_id', 'in', `(${ingredientsToExclude.join(',')})`);
                        } else {
                            console.log('No ingredients found to exclude based on allergies');
                        }
                    } else {
                        console.log('No valid allergens found with the provided IDs');
                    }
                }
            } catch (allergyProcessingError) {
                console.error('Error processing allergies:', allergyProcessingError);
                // Instead of throwing an error, we'll log it and continue without allergy filtering
                console.log('Continuing without allergy filtering due to error');
            }
        }

        // Process dietary requirements filter using dietary_requirement_new and dietary_requirement_ingredients tables
        if (options.dietaryRequirements && Array.isArray(options.dietaryRequirements) && options.dietaryRequirements.length > 0) {
            try {
                console.log(`Processing dietary requirements filter with ${options.dietaryRequirements.length} items`);
                
                // Ensure dietary requirements is an array of numbers
                let validDietaryIds = [];
                if (Array.isArray(options.dietaryRequirements)) {
                    validDietaryIds = options.dietaryRequirements
                        .filter(id => !isNaN(parseInt(id)))
                        .map(id => parseInt(id));
                } else {
                    console.error('DietaryRequirements is not an array, this should not happen as controller should convert it');
                    // Fallback handling just in case
                    validDietaryIds = [];
                }
                
                console.log(`Valid dietary requirement IDs: ${JSON.stringify(validDietaryIds)}`);
                
                if (validDietaryIds.length > 0) {
                    // Get dietary requirements information from dietary_requirement_new table
                    const { data: dietaryRequirementInfo, error: dietaryError } = await supabase
                        .from('dietary_requirement_new')
                        .select('dietary_requirement_id, requirement_name')
                        .in('dietary_requirement_id', validDietaryIds);
                    
                    if (dietaryError) {
                        console.error('Error fetching dietary requirements:', dietaryError);
                        throw new Error(`Database error: ${dietaryError.message}`);
                    }
                    
                    if (dietaryRequirementInfo && dietaryRequirementInfo.length > 0) {
                        console.log(`Found ${dietaryRequirementInfo.length} dietary requirements to consider`);
                        
                        // Get the dietary_requirement_ingredients mapping data for these dietary requirements
                        const { data: dietaryIngredients, error: dietaryIngredientsError } = await supabase
                            .from('dietary_requirement_ingredients')
                            .select('dietary_requirement_id, ingredient_id, recommendation_type')
                            .in('dietary_requirement_id', validDietaryIds);
                        
                        if (dietaryIngredientsError) {
                            console.error('Error fetching dietary requirement ingredients mapping:', dietaryIngredientsError);
                            throw new Error(`Database error: ${dietaryIngredientsError.message}`);
                        }
                        
                        if (dietaryIngredients && dietaryIngredients.length > 0) {
                            console.log(`Found ${dietaryIngredients.length} dietary requirement-ingredient mappings`);
                            
                            // Separate ingredients into include and avoid categories based on recommendation_type
                            const includeIngredients = {};
                            const avoidIngredients = {};
                            
                            // Initialize arrays for each dietary requirement
                            validDietaryIds.forEach(id => {
                                includeIngredients[id] = [];
                                avoidIngredients[id] = [];
                            });
                            
                            // Populate the arrays based on recommendation_type
                            dietaryIngredients.forEach(item => {
                                if (item.recommendation_type === 'include') {
                                    includeIngredients[item.dietary_requirement_id].push(item.ingredient_id);
                                } else if (item.recommendation_type === 'avoid') {
                                    avoidIngredients[item.dietary_requirement_id].push(item.ingredient_id);
                                }
                            });
                            
                            // Log the counts for debugging
                            validDietaryIds.forEach(id => {
                                console.log(`Dietary requirement ${id}: ${includeIngredients[id].length} include ingredients, ${avoidIngredients[id].length} avoid ingredients`);
                            });
                            
                            // Exclude all ingredients that should be avoided for any of the dietary requirements
                            let allAvoidIngredients = [];
                            validDietaryIds.forEach(id => {
                                allAvoidIngredients = [...allAvoidIngredients, ...avoidIngredients[id]];
                            });
                            
                            // Remove duplicates
                            allAvoidIngredients = [...new Set(allAvoidIngredients)];
                            
                            if (allAvoidIngredients.length > 0) {
                                console.log(`Excluding ${allAvoidIngredients.length} ingredients to avoid based on dietary requirements`);
                                query = query.not('ingredient_id', 'in', `(${allAvoidIngredients.join(',')})`);
                            }
                            
                            // Find ingredients that are recommended (include) for ALL selected dietary requirements
                            // Only apply this filter if there are actual include ingredients
                            let hasIncludeRecommendations = false;
                            validDietaryIds.forEach(id => {
                                if (includeIngredients[id].length > 0) {
                                    hasIncludeRecommendations = true;
                                }
                            });
                            
                            if (hasIncludeRecommendations) {
                                // Get the intersection of all include ingredients
                                let includeForAllRequirements = null;
                                
                                validDietaryIds.forEach(id => {
                                    if (includeIngredients[id].length > 0) {
                                        if (includeForAllRequirements === null) {
                                            includeForAllRequirements = [...includeIngredients[id]];
                                        } else {
                                            includeForAllRequirements = includeForAllRequirements.filter(ingredientId => 
                                                includeIngredients[id].includes(ingredientId));
                                        }
                                    }
                                });
                                
                                // If we have ingredients recommended for all dietary requirements, prioritize them
                                if (includeForAllRequirements && includeForAllRequirements.length > 0) {
                                    console.log(`Prioritizing ${includeForAllRequirements.length} ingredients recommended for all dietary requirements`);
                                    query = query.in('ingredient_id', includeForAllRequirements);
                                }
                            }
                        } else {
                            console.log('No dietary requirement-ingredient mappings found, falling back to default filtering');
                            
                            // Fallback to using the requirement_name for basic filtering
                            const dietaryIngredientMapping = {};
                            
                            // For each dietary requirement, identify suitable ingredients based on name
                            for (const dietaryReq of dietaryRequirementInfo) {
                                let ingredientQuery;
                                
                                // Different logic based on dietary requirement type
                                switch(dietaryReq.requirement_name.toLowerCase()) {
                                    case 'vegetarian':
                                        // For vegetarian, exclude meat and fish categories
                                        const { data: vegetarianIngredients, error: vegError } = await supabase
                                            .from('ingredients_new')
                                            .select('ingredient_id')
                                            .not('category', 'in', '(meat,fish,poultry)');
                                        
                                        if (!vegError && vegetarianIngredients) {
                                            dietaryIngredientMapping[dietaryReq.dietary_requirement_id] = vegetarianIngredients.map(ing => ing.ingredient_id);
                                        }
                                        break;
                                        
                                    case 'vegan':
                                        // For vegan, exclude animal products
                                        const { data: veganIngredients, error: veganError } = await supabase
                                            .from('ingredients_new')
                                            .select('ingredient_id')
                                            .not('category', 'in', '(meat,fish,poultry,dairy,eggs)');
                                        
                                        if (!veganError && veganIngredients) {
                                            dietaryIngredientMapping[dietaryReq.dietary_requirement_id] = veganIngredients.map(ing => ing.ingredient_id);
                                        }
                                        break;
                                        
                                    case 'gluten-free':
                                        // For gluten-free, exclude wheat-based ingredients
                                        const { data: glutenFreeIngredients, error: gfError } = await supabase
                                            .from('ingredients_new')
                                            .select('ingredient_id')
                                            .not('name', 'ilike', '%wheat%')
                                            .not('name', 'ilike', '%gluten%')
                                            .not('name', 'ilike', '%barley%')
                                            .not('name', 'ilike', '%rye%');
                                        
                                        if (!gfError && glutenFreeIngredients) {
                                            dietaryIngredientMapping[dietaryReq.dietary_requirement_id] = glutenFreeIngredients.map(ing => ing.ingredient_id);
                                        }
                                        break;
                                        
                                    default:
                                        // For other dietary requirements, use a keyword match approach
                                        const { data: matchingIngredients, error: matchError } = await supabase
                                            .from('ingredients_new')
                                            .select('ingredient_id')
                                            .ilike('name', `%${dietaryReq.requirement_name}%`);
                                        
                                        if (!matchError && matchingIngredients) {
                                            dietaryIngredientMapping[dietaryReq.dietary_requirement_id] = matchingIngredients.map(ing => ing.ingredient_id);
                                        }
                                        break;
                                }
                                
                                console.log(`Mapped dietary requirement ${dietaryReq.requirement_name} to ${dietaryIngredientMapping[dietaryReq.dietary_requirement_id]?.length || 0} ingredients`);
                            }
                            
                            // Find ingredients that satisfy ALL dietary requirements (intersection)
                            let validIngredientIds = [];
                            let isFirst = true;
                            
                            for (const dietaryId in dietaryIngredientMapping) {
                                if (isFirst) {
                                    validIngredientIds = dietaryIngredientMapping[dietaryId] || [];
                                    isFirst = false;
                                } else {
                                    // Keep only ingredients that are in both arrays (intersection)
                                    validIngredientIds = validIngredientIds.filter(id => 
                                        dietaryIngredientMapping[dietaryId].includes(id));
                                }
                            }
                            
                            if (validIngredientIds.length > 0) {
                                console.log(`Including ${validIngredientIds.length} ingredients that match all dietary requirements`);
                                query = query.in('ingredient_id', validIngredientIds);
                            } else {
                                console.log('No ingredients found that match all dietary requirements');
                            }
                        }
                    } else {
                        console.log('No valid dietary requirements found with the provided IDs');
                    }
                }
            } catch (dietaryProcessingError) {
                console.error('Error processing dietary requirements:', dietaryProcessingError);
                // Instead of throwing an error, we'll log it and continue without dietary filtering
                console.log('Continuing without dietary filtering due to error');
            }
        }

        // Process health conditions filter using health_conditions_new and condition_ingredients tables
        if (options.healthConditions && Array.isArray(options.healthConditions) && options.healthConditions.length > 0) {
            try {
                console.log(`Processing health conditions filter with ${options.healthConditions.length} items`);
                
                // Ensure health conditions is an array of numbers
                let validHealthIds = [];
                if (Array.isArray(options.healthConditions)) {
                    validHealthIds = options.healthConditions
                        .filter(id => !isNaN(parseInt(id)))
                        .map(id => parseInt(id));
                } else {
                    console.error('HealthConditions is not an array, this should not happen as controller should convert it');
                    // Fallback handling just in case
                    validHealthIds = [];
                }
                
                console.log(`Valid health condition IDs: ${JSON.stringify(validHealthIds)}`);
                
                if (validHealthIds.length > 0) {
                    // Get health conditions information from health_conditions_new table
                    const { data: healthConditionInfo, error: healthError } = await supabase
                        .from('health_conditions_new')
                        .select('condition_id, name, description, recommended_foods, restricted_foods, severity_level')
                        .in('condition_id', validHealthIds);
                    
                    if (healthError) {
                        console.error('Error fetching health conditions:', healthError);
                        throw new Error(`Database error: ${healthError.message}`);
                    }
                    
                    if (healthConditionInfo && healthConditionInfo.length > 0) {
                        console.log(`Found ${healthConditionInfo.length} health conditions to consider`);
                        
                        // Get the condition_ingredients mapping data for these health conditions
                        const { data: conditionIngredients, error: conditionIngredientsError } = await supabase
                            .from('condition_ingredients')
                            .select('condition_id, ingredient_id, recommendation_type')
                            .in('condition_id', validHealthIds);
                        
                        if (conditionIngredientsError) {
                            console.error('Error fetching condition ingredients mapping:', conditionIngredientsError);
                            throw new Error(`Database error: ${conditionIngredientsError.message}`);
                        }
                        
                        if (conditionIngredients && conditionIngredients.length > 0) {
                            console.log(`Found ${conditionIngredients.length} condition-ingredient mappings`);
                            
                            // Separate ingredients into include and avoid categories based on recommendation_type
                            const includeIngredients = {};
                            const avoidIngredients = {};
                            
                            // Initialize arrays for each condition
                            validHealthIds.forEach(id => {
                                includeIngredients[id] = [];
                                avoidIngredients[id] = [];
                            });
                            
                            // Populate the arrays based on recommendation_type
                            conditionIngredients.forEach(item => {
                                if (item.recommendation_type === 'include') {
                                    includeIngredients[item.condition_id].push(item.ingredient_id);
                                } else if (item.recommendation_type === 'avoid') {
                                    avoidIngredients[item.condition_id].push(item.ingredient_id);
                                }
                            });
                            
                            // Log the counts for debugging
                            validHealthIds.forEach(id => {
                                console.log(`Condition ${id}: ${includeIngredients[id].length} include ingredients, ${avoidIngredients[id].length} avoid ingredients`);
                            });
                            
                            // Exclude all ingredients that should be avoided for any of the conditions
                            let allAvoidIngredients = [];
                            validHealthIds.forEach(id => {
                                allAvoidIngredients = [...allAvoidIngredients, ...avoidIngredients[id]];
                            });
                            
                            // Remove duplicates
                            allAvoidIngredients = [...new Set(allAvoidIngredients)];
                            
                            if (allAvoidIngredients.length > 0) {
                                console.log(`Excluding ${allAvoidIngredients.length} ingredients to avoid based on health conditions`);
                                query = query.not('ingredient_id', 'in', `(${allAvoidIngredients.join(',')})`);
                            }
                            
                            // Find ingredients that are recommended (include) for ALL selected health conditions
                            // Only apply this filter if there are actual include ingredients
                            let hasIncludeRecommendations = false;
                            validHealthIds.forEach(id => {
                                if (includeIngredients[id].length > 0) {
                                    hasIncludeRecommendations = true;
                                }
                            });
                            
                            if (hasIncludeRecommendations) {
                                // Get the intersection of all include ingredients
                                let includeForAllConditions = null;
                                
                                validHealthIds.forEach(id => {
                                    if (includeIngredients[id].length > 0) {
                                        if (includeForAllConditions === null) {
                                            includeForAllConditions = [...includeIngredients[id]];
                                        } else {
                                            includeForAllConditions = includeForAllConditions.filter(ingredientId => 
                                                includeIngredients[id].includes(ingredientId));
                                        }
                                    }
                                });
                                
                                // If we have ingredients recommended for all conditions, prioritize them
                                if (includeForAllConditions && includeForAllConditions.length > 0) {
                                    console.log(`Prioritizing ${includeForAllConditions.length} ingredients recommended for all health conditions`);
                                    // We'll use a union query to prioritize recommended ingredients but still show others
                                    // This is a simplified approach - in a real implementation, you might want to add a 'recommended' flag
                                    // to the results instead of filtering
                                    query = query.in('ingredient_id', includeForAllConditions);
                                }
                            }
                        } else {
                            console.log('No condition-ingredient mappings found, using health condition metadata');
                            
                            // Fallback to using the recommended_foods and restricted_foods arrays from health_conditions_new
                            let allRestrictedFoods = [];
                            let allRecommendedFoods = [];
                            
                            healthConditionInfo.forEach(condition => {
                                if (condition.restricted_foods && Array.isArray(condition.restricted_foods)) {
                                    allRestrictedFoods = [...allRestrictedFoods, ...condition.restricted_foods];
                                }
                                if (condition.recommended_foods && Array.isArray(condition.recommended_foods)) {
                                    allRecommendedFoods = [...allRecommendedFoods, ...condition.recommended_foods];
                                }
                            });
                            
                            // Remove duplicates
                            allRestrictedFoods = [...new Set(allRestrictedFoods)];
                            allRecommendedFoods = [...new Set(allRecommendedFoods)];
                            
                            if (allRestrictedFoods.length > 0) {
                                console.log(`Using ${allRestrictedFoods.length} restricted foods from health conditions metadata`);
                                // Exclude ingredients that match restricted food keywords
                                allRestrictedFoods.forEach(food => {
                                    query = query.not('name', 'ilike', `%${food}%`);
                                });
                            }
                            
                            if (allRecommendedFoods.length > 0) {
                                console.log(`Using ${allRecommendedFoods.length} recommended foods from health conditions metadata`);
                                // Create a separate query for recommended foods and use it to prioritize results
                                let recommendedQuery = supabase
                                    .from('ingredients_new')
                                    .select('ingredient_id')
                                    .eq('category', originalIngredient.category)
                                    .neq('ingredient_id', parsedId);
                                
                                // Add conditions for each recommended food keyword
                                allRecommendedFoods.forEach(food => {
                                    recommendedQuery = recommendedQuery.or(`name.ilike.%${food}%`);
                                });
                                
                                const { data: recommendedIngredients, error: recommendedError } = await recommendedQuery;
                                
                                if (!recommendedError && recommendedIngredients && recommendedIngredients.length > 0) {
                                    const recommendedIds = recommendedIngredients.map(item => item.ingredient_id);
                                    console.log(`Found ${recommendedIds.length} ingredients matching recommended foods`);
                                    query = query.in('ingredient_id', recommendedIds);
                                }
                            }
                        }
                    } else {
                        console.log('No valid health conditions found with the provided IDs');
                    }
                }
            } catch (healthProcessingError) {
                console.error('Error processing health conditions:', healthProcessingError);
                // Instead of throwing an error, we'll log it and continue without health condition filtering
                console.log('Continuing without health condition filtering due to error');
            }
        }

        // Execute the query with pagination to limit result size
        console.log('Executing final query for substitutes');
        const PAGE_SIZE = 50; // Limit results to prevent excessive data transfer
        let { data, error, count } = await query
            .select('ingredient_id, name, category', { count: 'exact' })
            .limit(PAGE_SIZE);

        if (error) {
            console.error('Error fetching substitutes:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        const result = {
            original: originalIngredient,
            substitutes: data || [],
            pagination: {
                total: count || 0,
                limit: PAGE_SIZE,
                hasMore: (count || 0) > PAGE_SIZE
            }
        };
        
        console.log(`Found ${result.substitutes.length} substitutes for ${originalIngredient.name}`);
        return result;
    } catch (error) {
        console.error('Error in fetchIngredientSubstitutions:', error);
        throw error;
    }
}

module.exports = fetchIngredientSubstitutions;