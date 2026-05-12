const getMealPlanByUserIdAndDate = require('../model/getMealPlanByUserIdAndDate.js');

function resolveAccountUserId(req) {
    const requestUserId = req.query?.user_id;
    const currentUserId = req.user?.userId;
    const role = String(req.user?.role || '').toLowerCase();

    if ((role === 'admin' || role === 'nutritionist') && requestUserId) {
        return requestUserId;
    }

    return currentUserId;
}

const getAllAccount = async (req, res) => {
    try {
        const { created_at } = req.query;
        const user_id = resolveAccountUserId(req);

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
