const { body, param, query } = require('express-validator');

const createPostValidator = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be between 10 and 5000 characters'),
  body('imageUrl')
    .optional({ nullable: true })
    .isURL()
    .withMessage('imageUrl must be a valid URL'),
];

const createCommentValidator = [
  param('postId').notEmpty().withMessage('postId is required'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment cannot be empty')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
];

const postIdParamValidator = [
  param('postId').notEmpty().withMessage('postId is required'),
];

const feedQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('pageSize must be between 1 and 50'),
];

const leaderboardQueryValidator = [
  query('timeframe')
    .optional()
    .isIn(['weekly', 'monthly', 'all_time'])
    .withMessage('timeframe must be one of: weekly, monthly, all_time'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

module.exports = {
  createPostValidator,
  createCommentValidator,
  postIdParamValidator,
  feedQueryValidator,
  leaderboardQueryValidator,
};
