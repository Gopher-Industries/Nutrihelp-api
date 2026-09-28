const express = require('express');
const router = express.Router();
const recipeReviewController = require('../controller/recipeReviewController');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

router.get('/feed', recipeReviewController.listFeed);
router.get('/', recipeReviewController.listReviews);
router.post('/summary', recipeReviewController.getSummaries);
router.post('/', authenticateToken, recipeReviewController.createReview);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), recipeReviewController.hideReview);

module.exports = router;
