const express = require('express');
const router = express.Router();
const controller = require('../controller/barcodeController'); // Adjusted path
const validate = require('../middleware/validate');
const { barcodeScan } = require('../validators/utilitySchemas');

// Standardized Barcode Scan Endpoint
router.post('/scan', validate(barcodeScan, 'body'), controller.handleScan);

module.exports = router;
