const express = require('express');
const router = express.Router();
const medicalPredictionController = require('../../controller/medicalPredictionController');

// POST /ai-model/medical-report/retrieve
router.post('/retrieve', medicalPredictionController.predict);

module.exports = router;
