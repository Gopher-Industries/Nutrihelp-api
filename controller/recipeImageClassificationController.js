/**
 * Safe stub for image classification until full implementation is added.
 * Exports both classifyImage (used by routes/routes.js) and predictRecipeImage (used by routes/recipeImageClassification.js)
 */

async function handleNotConfigured(req, res) {
  return res.status(501).json({ success: false, error: 'Image classification not configured' });
}

module.exports = {
  classifyImage: handleNotConfigured,
  predictRecipeImage: handleNotConfigured
};
