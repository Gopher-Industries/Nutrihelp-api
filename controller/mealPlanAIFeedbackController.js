const { saveFeedback, getPlanById } = require('../model/aiMealPlanModel');

const submitFeedback = async (req, res) => {
  try {
    const { planId } = req.params;
    const { rating, likedMeals, dislikedMeals, followedPlan, notes } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be a number between 1 and 5' });
    }

    // Verify the plan exists before saving feedback
    try {
      await getPlanById(planId);
    } catch {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const feedbackId = await saveFeedback({
      mealPlanId: planId,
      rating,
      likedMeals: Array.isArray(likedMeals) ? likedMeals : [],
      dislikedMeals: Array.isArray(dislikedMeals) ? dislikedMeals : [],
      followedPlan: followedPlan === true,
      notes: typeof notes === 'string' ? notes.slice(0, 500) : null,
    });

    return res.status(201).json({ success: true, feedbackId });
  } catch (error) {
    console.error({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { submitFeedback };
