const { generateMealPlan } = require('../services/mealPlanAIService');
const { saveMealPlan } = require('../model/aiMealPlanModel');

const generateAIMealPlan = async (req, res) => {
  try {
    const dietType = typeof req.body.dietType === 'string' ? req.body.dietType : 'balanced';
    const goal = typeof req.body.goal === 'string' ? req.body.goal : 'maintain weight';
    const allergies = Array.isArray(req.body.allergies) ? req.body.allergies : [];
    const calorieTarget = typeof req.body.calorieTarget === 'number' ? req.body.calorieTarget : 1800;
    const cuisine = typeof req.body.cuisine === 'string' ? req.body.cuisine : 'any';
    const healthConditions = Array.isArray(req.body.healthConditions) ? req.body.healthConditions : [];
    const mealTexture = ['regular', 'soft', 'pureed'].includes(req.body.mealTexture) ? req.body.mealTexture : 'regular';
    const mobilityLevel = ['sedentary', 'lightly_active', 'moderately_active'].includes(req.body.mobilityLevel) ? req.body.mobilityLevel : 'sedentary';
    const cookingComplexity = ['simple', 'moderate', 'complex'].includes(req.body.cookingComplexity) ? req.body.cookingComplexity : 'simple';
    const portionSize = ['small', 'medium', 'large'].includes(req.body.portionSize) ? req.body.portionSize : 'medium';
    const additionalNotes = typeof req.body.additionalNotes === 'string' ? req.body.additionalNotes.slice(0, 300) : '';

    if (calorieTarget < 500 || calorieTarget > 5000) {
      return res.status(400).json({ error: 'calorieTarget must be between 500 and 5000' });
    }

    const filters = {
      dietType, goal, allergies, calorieTarget, cuisine,
      healthConditions, mealTexture, mobilityLevel, cookingComplexity, portionSize, additionalNotes,
    };

    const { parsed, aiModelUsed } = await generateMealPlan(filters);

    // Save to Supabase — user_id from JWT if authenticated, otherwise null
    let planId = null;
    try {
      const userId = req.user?.id || req.user?.user_id || null;
      planId = await saveMealPlan({
        userId,
        filters,
        plan: parsed,
        aiModelUsed,
      });
    } catch (saveErr) {
      // Log but don't fail the request — the user still gets their plan
      console.error('Failed to save meal plan to DB:', saveErr.message);
    }

    return res.status(200).json({ success: true, planId, data: parsed });
  } catch (error) {
    console.error({ error: error.message });

    if (error.message === 'AI service not configured') {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    if (error.message === 'AI generation failed, please try again') {
      return res.status(500).json({ error: 'AI generation failed, please try again' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { generateAIMealPlan };
