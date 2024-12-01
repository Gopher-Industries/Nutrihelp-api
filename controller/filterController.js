const supabase = require('../dbConnection');

/**
 * Filter recipes based on dietary preferences and allergens
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const filterRecipes = async (req, res) => {
    const { allergies, dietary } = req.query;

    try {
        
        const { data: dietaryMapping, error: dietaryError } = await supabase
            .from('dietary_requirements')
            .select('id, name');

        if (dietaryError) throw dietaryError;

       
        const dietaryFilterIds = dietary
            ? dietaryMapping
                .filter(d => d.name.toLowerCase().includes(dietary.toLowerCase()))
                .map(d => d.id.toString())
            : [];

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

        
        const allergyList = allergies
            ? (Array.isArray(allergies) ? allergies : allergies.split(',')).map(allergy =>
                allergy.toLowerCase()
            )
            : [];

        const filteredRecipes = recipes.filter(recipe => {
     
            const hasAllergy = recipe.ingredients.some(ingredient => {
                return (
                    ingredient.allergies_type &&
                    allergyList.some(allergy =>
                        ingredient.allergies_type.name
                            .toLowerCase()
                            .includes(allergy) 
                    )
                );
            });

            
            if (hasAllergy) return false;

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



