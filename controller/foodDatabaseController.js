const supabase = require('../dbConnection');

exports.searchFood = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ success: false, error: 'query param required' });

        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(20);

        if (error) throw error;
        res.status(200).json({ success: true, data: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
