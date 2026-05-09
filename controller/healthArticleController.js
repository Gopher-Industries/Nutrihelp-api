const getHealthArticles = require('../model/getHealthArticles');
const { shared } = require('../services');
const logger = require('../utils/logger');

const { createErrorResponse, createSuccessResponse } = shared.apiResponse;

const searchHealthArticles = async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json(createErrorResponse('Missing query parameter', 'VALIDATION_ERROR'));
  }

  try {
    const articles = await getHealthArticles(query);
    return res.status(200).json(createSuccessResponse({
      articles
    }, {
      count: Array.isArray(articles) ? articles.length : 0
    }));
  } catch (error) {
    logger.error('Error searching articles', { error: error.message, query });
    return res.status(500).json(createErrorResponse('Internal server error', 'ARTICLES_SEARCH_FAILED'));
  }
};

module.exports = {
  searchHealthArticles,
};
