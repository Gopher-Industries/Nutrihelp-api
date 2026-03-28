const express = require('express');
const router = express.Router();
const medicalPredictionController = require('../controller/medicalPredictionController');
const healthPlanController = require('../controller/healthPlanController');

// router.route('/predict').post(obesityPredictionController.predict);
router.route('/retrieve').post(medicalPredictionController.predict);

router.route('/plan').post(healthPlanController.generateWeeklyPlan);

module.exports = router;
