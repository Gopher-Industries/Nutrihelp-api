const supabase = require('../dbConnection');

/**
 * Update the daily water intake for a user
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updateWaterIntake = async (req, res) => {
    try {
        const { user_id, glasses_consumed } = req.body;
        const date = new Date().toISOString().split('T')[0]; 

        if (!user_id || typeof glasses_consumed !== 'number') {
            return res.status(400).json({ error: 'User ID and glasses consumed are required' });
        }

        const { data, error } = await supabase
            .from('water_intake')
            .upsert({
                user_id: user_id,
                date: date,
                glasses_consumed: glasses_consumed,
                updated_at: new Date().toISOString()
            }, { onConflict: ['user_id', 'date'] });

        if (error) {
            console.error('Error updating water intake:', error.message);
            return res.status(500).json({ error: 'Failed to update water intake' });
        }

        return res.status(200).json({ message: 'Water intake updated successfully', data });
    } catch (error) {
        console.error('Internal server error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { updateWaterIntake };
