const supabase = require('../dbConnection.js');

/**
 * GET /api/recipe/nutrition?name=...
 * - Returns standardized envelope: { success: true, data: {...} } or error envelope
 */
exports.getRecipeNutritionByName = async (req, res) => {
  const recipeName = req.query?.name;

  if (!recipeName) {
    return res.status(400).json({ success: false, error: "Missing 'name' query parameter" });
  }

  try {
    // use wildcard substring match
    const pattern = `%${recipeName}%`;

    const { data, error } = await supabase
      .from('recipes')
      .select(`
        recipe_name,
        calories,
        fat,
        carbohydrates,
        protein,
        fiber,
        vitamin_a,
        vitamin_b,
        vitamin_c,
        vitamin_d,
        sodium,
        sugar
      `)
      .ilike('recipe_name', pattern)
      .limit(1);

    if (error) {
      console.error('[getRecipeNutritionByName] Supabase error:', error);
      return res.status(500).json({ success: false, error: 'DB query failed', details: String(error.message || error) });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    return res.status(200).json({ success: true, data: data[0] });
  } catch (err) {
    console.error('[getRecipeNutritionByName] Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Server error', details: String(err.message || err) });
  }
};
