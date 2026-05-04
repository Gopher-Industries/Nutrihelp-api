const supabase = require('../dbConnection');

const normalizeId = (id) => {
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
    return id;
};

exports.getUserRecipes = async (req, res) => {
    try {
        let userId = req.params.user_id || req.query.user_id;
        if (!userId) return res.status(400).json({ success: false, error: 'user_id is required' });
        
        userId = normalizeId(userId);

        const { data, error } = await supabase
            .from('user_recipes')
            .select('*, recipes(*)')
            .eq('user_id', userId);

        if (error) throw error;
        res.status(200).json({ success: true, data: data || [] });
    } catch (err) {
        console.error('getUserRecipes error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getRecipeNutrition = async (req, res) => {
    res.status(200).json({ success: true, data: { calories: 250, protein: '20g' }, message: 'Stub response' });
};
