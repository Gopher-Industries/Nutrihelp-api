const supabase = require('../dbConnection.js');

exports.getRecipeNutritionByName = async (req, res) => {
    const recipeName = req.query.name;

    if (!recipeName) {
        return res.status(400).json({ error: "Missing 'name' query parameter" });
    }

    try {
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
            .ilike('recipe_name', recipeName); // case-insensitive match

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        return res.json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};