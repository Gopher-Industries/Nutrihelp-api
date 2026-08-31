const { authenticateAIToken } = require('../../middleware/authenticateAIToken');
const express = require('express');
const router = express.Router();

router.use(authenticateAIToken);
const medicalPredictionController = require('../../controller/medicalPredictionController');

// POST /ai-model/medical-report/retrieve
router.post('/retrieve', medicalPredictionController.predict);

module.exports = router;
