const express = require('express');
const router = express.Router();
const medicalPredictionController = require('../controller/medicalPredictionController');

// router.route('/predict').post(obesityPredictionController.predict);
router.route('/retrieve').post(medicalPredictionController.predict);

module.exports = router;
