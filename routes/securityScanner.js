const express = require('express');

const router = express.Router();

const {
  getScanResults,
  getScanHistory,
  getHistoricalScan,
} = require('../controller/securityScannerController');

const {
  runScan,
  getRules,
} = require('../controller/securityScanController');

// GET /api/security-scanner/results
router.get('/results', getScanResults);

// GET /api/security-scanner/history
router.get('/history', getScanHistory);

// GET /api/security-scanner/history/:scanId
router.get('/history/:scanId', getHistoricalScan);

// POST /api/security-scanner/scan
router.post('/scan', runScan);

// Return available security rules for dashboard selection.
router.get('/rules', getRules);

module.exports = router;