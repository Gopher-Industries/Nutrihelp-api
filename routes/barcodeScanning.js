const express = require('express');
const router = express.Router();
const barcodeScanningController = require('../controller/barcodeScanningController');

router.route('/').get(barcodeScanningController.checkAllergen);

module.exports = router;
