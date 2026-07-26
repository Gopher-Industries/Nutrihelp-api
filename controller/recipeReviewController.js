const recipeReviewService = require('../services/recipeReviewService');

function sendSuccess(res, data, meta = {}) {
  const { statusCode = 200, message, ...rest } = meta || {};
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
    ...rest,
  });
}

function sendError(res, error, fallbackCode = 'RECIPE_REVIEW_ERROR') {
  const statusCode = error?.statusCode || error?.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: error?.message || 'Internal server error',
    code: error?.code || fallbackCode,
  });
}

async function listReviews(req, res) {
  try {
    const result = await recipeReviewService.getReviews(req.query.source_type, req.query.recipe_id);
    return sendSuccess(res, result.items, { summary: result.summary });
  } catch (error) {
    return sendError(res, error, 'RECIPE_REVIEWS_LIST_FAILED');
  }
}

async function createReview(req, res) {
  try {
    const result = await recipeReviewService.submitReview(req.body, req.user);
    return sendSuccess(res, result.item, {
      statusCode: 201,
      summary: result.summary,
      message: 'Review saved successfully',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_REVIEW_SAVE_FAILED');
  }
}

async function getSummaries(req, res) {
  try {
    const summary = await recipeReviewService.getReviewSummaries(req.body?.items || []);
    return sendSuccess(res, summary);
  } catch (error) {
    return sendError(res, error, 'RECIPE_REVIEW_SUMMARY_FAILED');
  }
}

async function listFeed(req, res) {
  try {
    const result = await recipeReviewService.listReviewFeed(req.query || {});
    return sendSuccess(res, result.items, {
      summary: result.summary,
      filters: result.filters,
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_REVIEW_FEED_FAILED');
  }
}

async function hideReview(req, res) {
  try {
    const result = await recipeReviewService.hideReviewByAdmin(req.params.id, req.user);
    return sendSuccess(res, result, {
      message: result?.alreadyHidden ? 'Review already hidden' : 'Review hidden successfully',
    });
  } catch (error) {
    return sendError(res, error, 'RECIPE_REVIEW_HIDE_FAILED');
  }
}

module.exports = {
  listReviews,
  createReview,
  getSummaries,
  listFeed,
  hideReview,
};
