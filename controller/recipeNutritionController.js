const recipeRepository = require('../repositories/recipeRepository');

exports.getRecipeNutritionByName = async (req, res) => {
    const recipeName = req.query.name;

    if (!recipeName) {
        return res.status(400).json({ error: "Missing 'name' query parameter" });
    }

    try {
        const data = await recipeRepository.findNutritionByRecipeName(recipeName);

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        return res.json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};
