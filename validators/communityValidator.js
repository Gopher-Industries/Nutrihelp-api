const { body, query, param } = require('express-validator');

// Validation for creating a community post
const createPostValidation = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('content')
        .notEmpty()
        .withMessage('Post content cannot be empty')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Post content must be between 10-2000 characters'),
    body('category')
        .notEmpty()
        .withMessage('Category cannot be empty')
        .isIn(['weight-loss', 'fitness', 'dietary-restrictions', 'meal-prep', 'nutrition-tips', 'success-story', 'recipe-share', 'motivation'])
        .withMessage('Invalid category'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array')
        .custom((tags) => {
            if (tags && tags.length > 10) {
                throw new Error('Maximum 10 tags allowed');
            }
            if (tags) {
                tags.forEach(tag => {
                    if (typeof tag !== 'string' || tag.length > 50) {
                        throw new Error('Each tag must be a string with max 50 characters');
                    }
                });
            }
            return true;
        }),
    body('image_url')
        .optional()
        .custom((value) => {
            if (value === null || value === undefined || value === '') {
                return true; // Allow null, undefined, or empty string
            }
            // Allow both HTTP/HTTPS URLs and base64 data URLs
            const httpPattern = /^https?:\/\/.+/;
            const dataUrlPattern = /^data:image\/[a-zA-Z]+;base64,.+/;
            if (!httpPattern.test(value) && !dataUrlPattern.test(value)) {
                throw new Error('Image URL must be a valid URL or base64 data URL');
            }
            return true;
        })
];

// Validation for updating a community post
const updatePostValidation = [
    param('id')
        .notEmpty()
        .withMessage('Post ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Post ID must be a positive integer'),
    body('content')
        .optional()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Post content must be between 10-2000 characters'),
    body('category')
        .optional()
        .isIn(['weight-loss', 'fitness', 'dietary-restrictions', 'meal-prep', 'nutrition-tips', 'success-story', 'recipe-share', 'motivation'])
        .withMessage('Invalid category'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array')
        .custom((tags) => {
            if (tags && tags.length > 10) {
                throw new Error('Maximum 10 tags allowed');
            }
            if (tags) {
                tags.forEach(tag => {
                    if (typeof tag !== 'string' || tag.length > 50) {
                        throw new Error('Each tag must be a string with max 50 characters');
                    }
                });
            }
            return true;
        }),
    body('image_url')
        .optional()
        .custom((value) => {
            if (value === null || value === undefined || value === '') {
                return true; // Allow null, undefined, or empty string
            }
            // Allow both HTTP/HTTPS URLs and base64 data URLs
            const httpPattern = /^https?:\/\/.+/;
            const dataUrlPattern = /^data:image\/[a-zA-Z]+;base64,.+/;
            if (!httpPattern.test(value) && !dataUrlPattern.test(value)) {
                throw new Error('Image URL must be a valid URL or base64 data URL');
            }
            return true;
        })
];

// Validation for getting community posts
const getPostsValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1-50'),
    query('category')
        .optional()
        .isIn(['all', 'weight-loss', 'fitness', 'dietary-restrictions', 'meal-prep', 'nutrition-tips', 'success-story', 'recipe-share', 'motivation'])
        .withMessage('Invalid category'),
    query('search')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Search query cannot exceed 100 characters'),
    query('user_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    query('sort_by')
        .optional()
        .isIn(['created_at', 'likes_count', 'comments_count'])
        .withMessage('Invalid sort field'),
    query('sort_order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
];

// Validation for getting a single post
const getPostValidation = [
    param('id')
        .notEmpty()
        .withMessage('Post ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Post ID must be a positive integer')
];

// Validation for deleting a post
const deletePostValidation = [
    param('id')
        .notEmpty()
        .withMessage('Post ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Post ID must be a positive integer')
];

// Validation for creating a comment
const createCommentValidation = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('post_id')
        .notEmpty()
        .withMessage('Post ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Post ID must be a positive integer'),
    body('content')
        .notEmpty()
        .withMessage('Comment content cannot be empty')
        .isLength({ min: 1, max: 500 })
        .withMessage('Comment content must be between 1-500 characters')
];

// Validation for updating a comment
const updateCommentValidation = [
    param('id')
        .notEmpty()
        .withMessage('Comment ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Comment ID must be a positive integer'),
    body('content')
        .notEmpty()
        .withMessage('Comment content cannot be empty')
        .isLength({ min: 1, max: 500 })
        .withMessage('Comment content must be between 1-500 characters')
];

// Validation for deleting a comment
const deleteCommentValidation = [
    param('id')
        .notEmpty()
        .withMessage('Comment ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Comment ID must be a positive integer')
];

// Validation for getting comments
const getCommentsValidation = [
    param('postId')
        .notEmpty()
        .withMessage('Post ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Post ID must be a positive integer'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1-50')
];

// Validation for liking/unliking a post
const likePostValidation = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('post_id')
        .notEmpty()
        .withMessage('Post ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Post ID must be a positive integer')
];

// Validation for getting user's liked posts
const getUserLikedPostsValidation = [
    param('userId')
        .notEmpty()
        .withMessage('User ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1-50')
];

module.exports = {
    createPostValidation,
    updatePostValidation,
    getPostsValidation,
    getPostValidation,
    deletePostValidation,
    createCommentValidation,
    updateCommentValidation,
    deleteCommentValidation,
    getCommentsValidation,
    likePostValidation,
    getUserLikedPostsValidation
};
