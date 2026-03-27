const waterIntakeRepository = require('../repositories/waterIntakeRepository');

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

        const data = await waterIntakeRepository.upsertWaterIntake({
            userId: user_id,
            date,
            glassesConsumed: glasses_consumed,
            updatedAt: new Date().toISOString()
        });

        return res.status(200).json({ message: 'Water intake updated successfully', data });
    } catch (error) {
        console.error('Internal server error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { updateWaterIntake };
