const foodRepository = require('../repositories/foodRepository');

/**
 * Get Food Data Grouped by mealType
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getFoodData = async (req, res) => {
    try {
        const data = await foodRepository.getAllFoodData();

        // Initialize grouped object
        const grouped = {
            breakfast: [],
            lunch: [],
            dinner: []
        };

        // Format and group data by meal_type
        data.forEach(item => {
            const formatted = {
                id: item.id,
                name: item.name,
                imageUrl: item.image_url,
                details: {
                    calories: item.calories_per_100g,
                    fats: item.fats,
                    proteins: item.protein,
                    vitamins: item.vitamins,
                    sodium: item.sodium
                }
            };

            // Push into correct group based on meal_type
            if (grouped[item.meal_type]) {
                grouped[item.meal_type].push(formatted);
            }
        });

        return res.status(200).json({
            message: 'Get food data successfully',
            data: grouped
        });

    } catch (error) {
        console.error('Internal server error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getFoodData };
