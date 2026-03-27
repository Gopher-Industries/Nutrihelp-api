const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function getDietaryRequirements() {
  try {
    const { data, error } = await supabase
      .from('dietary_requirements')
      .select('id, name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load dietary requirements', error);
  }
}

async function getAllergies() {
  try {
    const { data, error } = await supabase
      .from('allergies')
      .select('id, name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load allergies', error);
  }
}

async function getRecipesWithIngredients() {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        recipe_name,
        dietary,
        dietary_requirements (
          id,
          name
        ),
        ingredients (
          id,
          name,
          allergies_type (
            id,
            name
          )
        )
      `);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load recipes with ingredients', error);
  }
}

module.exports = {
  getAllergies,
  getDietaryRequirements,
  getRecipesWithIngredients
};
