const express = require('express');
const router = express.Router();
const obesityPredictionController = require('../controller/obesityPredictionController');

router.route('/predict').post(obesityPredictionController.predict);

module.exports = router;
