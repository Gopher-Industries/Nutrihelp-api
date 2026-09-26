const supabase = require('../dbConnection.js');

exports.getArticles = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getArticles DB error:', error);
            return res.status(500).json({ success: false, error: 'Database error', details: error.message });
        }

        return res.status(200).json({ success: true, data: data || [] });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.getArticleById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) return res.status(500).json({ success: false, error: error.message });
        if (!data) return res.status(404).json({ success: false, error: 'Article not found' });

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};
