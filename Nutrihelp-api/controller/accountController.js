const getMealPlanByUserIdAndDate = require('../model/getMealPlanByUserIdAndDate.js');

const getAllAccount = async (req, res) => {
    try {
        const { user_id, created_at } = req.query;

        const mealPlans = await getMealPlanByUserIdAndDate(user_id, created_at);

        if (!mealPlans || mealPlans.length === 0) {
            return res.status(404).json({ message: 'No meal plans found' });
        }

        res.status(200).json(mealPlans);
    } catch (error) {
        console.log('Error retrieving appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getAllAccount
};