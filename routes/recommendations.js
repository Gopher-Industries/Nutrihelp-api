const express = require('express');
const router = express.Router();
const recommendationController = require('../controller/recommendationController');
const { authenticateToken } = require('../middleware/authenticateToken');

router.post('/', authenticateToken, recommendationController.getRecommendations);

module.exports = router;
