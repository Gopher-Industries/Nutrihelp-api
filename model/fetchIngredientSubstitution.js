const ingredientSubstitutionRepository = require('../repositories/ingredientSubstitutionRepository');

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
    return ingredientSubstitutionRepository.fetchIngredientSubstitutions(ingredientId, options);
}

module.exports = fetchIngredientSubstitutions;
