const ingredientSubstitutionRepository = require('../repositories/ingredientSubstitutionRepository');

async function fetchIngredientSubstitutions(ingredientId, options = {}) {
  if (!ingredientId) {
    throw new Error('Ingredient ID is required');
  }

  const parsedId = parseInt(ingredientId, 10);
  if (Number.isNaN(parsedId)) {
    throw new Error('Invalid ingredient ID');
  }

  const normalizedOptions = { ...options };

  for (const key of ['allergies', 'dietaryRequirements', 'healthConditions']) {
    if (normalizedOptions[key] === undefined) {
      continue;
    }

    if (Array.isArray(normalizedOptions[key])) {
      normalizedOptions[key] = normalizedOptions[key]
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id));
      continue;
    }

    if (typeof normalizedOptions[key] === 'string') {
      normalizedOptions[key] = normalizedOptions[key]
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
      continue;
    }

    normalizedOptions[key] = [];
  }

  return ingredientSubstitutionRepository.fetchIngredientSubstitutions(parsedId, normalizedOptions);
}

module.exports = fetchIngredientSubstitutions;
