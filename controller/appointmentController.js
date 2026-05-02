const supabase = require('../dbConnection');

const normalizeId = (id) => {
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
    return id;
};

exports.getAppointments = async (req, res) => {
    try {
        let userId = req.query.user_id;
        if (!userId) return res.status(400).json({ success: false, error: 'user_id required' });

        userId = normalizeId(userId);

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        res.status(200).json({ success: true, data: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
