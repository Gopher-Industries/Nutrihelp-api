const supabase = require('../dbConnection');

/**
 * Filter recipes based on dietary preferences and allergens
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const filterRecipes = async (req, res) => {
    const { allergies, dietary } = req.query;

    try {
        // Fetch the mapping of dietary names to IDs
        const { data: dietaryMapping, error: dietaryError } = await supabase
            .from('dietary_requirements')
            .select('id, name');

        if (dietaryError) throw dietaryError;

        // Validate dietary input
        if (dietary && !dietaryMapping.some(d => d.name.toLowerCase().includes(dietary.toLowerCase()))) {
            return res.status(400).json({ error: "Invalid dietary requirement provided" });
        }

        // Find dietary IDs for partial matches
        const dietaryFilterIds = dietary
            ? dietaryMapping
                .filter(d => d.name.toLowerCase().includes(dietary.toLowerCase()))
                .map(d => d.id.toString())
            : [];

        // Fetch recipes with their dietary requirements and ingredients
        const { data: recipes, error: recipeError } = await supabase
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

        if (recipeError) throw recipeError;

        // Validate allergies input
        const allergyList = allergies
            ? (Array.isArray(allergies) ? allergies : allergies.split(',')).map(allergy =>
                allergy.toLowerCase().trim()
            )
            : [];

        const { data: allergensMapping, error: allergensError } = await supabase
            .from('allergies')
            .select('id, name');

        if (allergensError) throw allergensError;

        if (
            allergyList.length &&
            !allergyList.every(allergy =>
                allergensMapping.some(a => a.name.toLowerCase().includes(allergy))
            )
        ) {
            return res.status(400).json({ error: "Invalid allergen provided" });
        }

        // Filter recipes based on dietary requirements and allergens
        const filteredRecipes = recipes.filter(recipe => {
            // Check if any ingredient in the recipe has an allergen matching the allergyList (partial match)
            const hasAllergy = recipe.ingredients.some(ingredient => {
                return (
                    ingredient.allergies_type &&
                    allergyList.some(allergy =>
                        ingredient.allergies_type.name
                            .toLowerCase()
                            .includes(allergy) // Check for partial match
                    )
                );
            });

            // Exclude recipes with ingredients containing allergens
            if (hasAllergy) return false;

            // Check if recipe matches any of the dietary filter IDs
            const dietaryCheck =
                !dietaryFilterIds.length ||
                (recipe.dietary && dietaryFilterIds.includes(recipe.dietary.toString()));

            return dietaryCheck;
        });

        res.status(200).json(filteredRecipes);
    } catch (error) {
        console.error('Error filtering recipes:', error.message);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    filterRecipes,
};
