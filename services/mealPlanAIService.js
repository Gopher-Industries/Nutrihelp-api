let genAI;
try {
  genAI = require('@google/generative-ai');
} catch (e) {
  console.warn('@google/generative-ai not installed — mealPlanAI features disabled');
  genAI = null;
}

// Example exported API (adapt to original implementation as needed)
module.exports = {
  generateMealPlan: async (opts) => {
    if (!genAI) throw new Error('MealPlanAI not available');
    // original generation logic should be here; keep as-is if present
    return { statusCode: 501, body: { success: false, error: 'MealPlanAI not configured' } };
  }
};
