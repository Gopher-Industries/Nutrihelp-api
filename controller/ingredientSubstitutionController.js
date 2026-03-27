const fetchIngredientSubstitutions = require("../model/fetchIngredientSubstitutions.js");

/**
 * Get substitution options for a specific ingredient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getIngredientSubstitutions = async (req, res) => {
    try {
        const { ingredientId } = req.params;
        
        if (!ingredientId) {
            return res.status(400).json({ error: "Ingredient ID is required" });
        }

        // Validate ingredientId is a number
        const parsedId = parseInt(ingredientId);
        if (isNaN(parsedId)) {
            return res.status(400).json({ error: "Ingredient ID must be a number" });
        }

        // Extract optional filter parameters from query string
        const options = {};
        
        // Parse allergies if provided
        if (req.query.allergies) {
            try {
                options.allergies = Array.isArray(req.query.allergies) 
                    ? req.query.allergies.map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                    : req.query.allergies.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            } catch (parseError) {
                console.error('Error parsing allergies:', parseError);
                options.allergies = [];
            }
        }
        
        // Parse dietary requirements if provided
        if (req.query.dietaryRequirements) {
            try {
                options.dietaryRequirements = Array.isArray(req.query.dietaryRequirements) 
                    ? req.query.dietaryRequirements.map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                    : req.query.dietaryRequirements.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            } catch (parseError) {
                console.error('Error parsing dietary requirements:', parseError);
                options.dietaryRequirements = [];
            }
        }
        
        // Parse health conditions if provided
        if (req.query.healthConditions) {
            try {
                options.healthConditions = Array.isArray(req.query.healthConditions) 
                    ? req.query.healthConditions.map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                    : req.query.healthConditions.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            } catch (parseError) {
                console.error('Error parsing health conditions:', parseError);
                options.healthConditions = [];
            }
        }

        const substitutions = await fetchIngredientSubstitutions(parsedId, options);
        return res.status(200).json(substitutions);
    } catch (error) {
        console.error('Error in getIngredientSubstitutions:', error);
        if (error.message === 'Ingredient not found') {
            return res.status(404).json({ error: error.message });
        } else if (error.message === 'Invalid ingredient ID') {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getIngredientSubstitutions
};
