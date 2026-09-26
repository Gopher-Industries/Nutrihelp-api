const express = require('express');
const router = express.Router();
const { coreApp } = require('../controller');
const { authenticateToken } = require('../middleware/authenticateToken');

const { recommendations: recommendationController } = coreApp;

router.post('/', authenticateToken, recommendationController.getRecommendations);

module.exports = router;
