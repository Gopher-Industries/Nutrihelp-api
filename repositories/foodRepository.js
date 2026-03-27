const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function getAllFoodData() {
  try {
    const { data, error } = await supabase
      .from('food_database')
      .select(`
        id,
        name,
        image_url,
        meal_type,
        calories_per_100g,
        fats,
        protein,
        vitamins,
        sodium
      `)
      .order('meal_type', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load food data', error);
  }
}

module.exports = {
  getAllFoodData
};
