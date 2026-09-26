const express = require('express');
const router = express.Router();
const controller = require('../controller/barcodeScanningController');
const validate = require('../middleware/validate');
const { barcodeScan } = require('../validators/utilitySchemas');

// Standardized Barcode Scan Endpoint
router.post('/scan', validate(barcodeScan, 'body'), controller.checkAllergen);

module.exports = router;
