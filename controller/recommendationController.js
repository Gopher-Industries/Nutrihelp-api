const { generateRecommendations } = require('../services/recommendationService');

async function getRecommendations(req, res) {
  try {
    const result = await generateRecommendations({
      userId: req.user?.userId || req.body?.userId,
      email: req.user?.email || req.body?.email,
      healthGoals: req.body?.healthGoals || {},
      dietaryConstraints: req.body?.dietaryConstraints || {},
      aiInsights: req.body?.aiInsights || null,
      medicalReport: req.body?.medicalReport || null,
      aiAdapterInput: req.body?.aiAdapterInput || null,
      maxResults: req.body?.maxResults,
      refreshCache: req.body?.refreshCache === true
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[recommendationController] error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate recommendations'
    });
  }
}

module.exports = {
  getRecommendations
};
