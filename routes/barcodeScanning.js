const express = require('express');
const router = express.Router();
const barcodeScanningController = require('../controller/barcodeScanningController');

router.route('/').post(barcodeScanningController.checkAllergen);

module.exports = router;
