const supabase = require('../dbConnection');

/**
 * Get Food Data Grouped by mealType
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getFoodData = async (req, res) => {
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

        if (error) {
            console.error('Error getting food data:', error.message);
            return res.status(500).json({ error: 'Failed to get food data' });
        }

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
