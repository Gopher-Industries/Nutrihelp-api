const express = require('express');
const router = express.Router();

const {
  getScanResults,
} = require('../controller/securityScannerController');

/**
 * @swagger
 * /api/security-scanner/results:
 *   get:
 *     summary: Retrieve the latest secure code analysis results
 *     tags: [Security Scanner]
 *     responses:
 *       200:
 *         description: Security scan results retrieved successfully
 *       404:
 *         description: No security scan results were found
 *       500:
 *         description: Unable to retrieve security scan results
 */

// GET /api/security-scanner/results
router.get('/results', getScanResults);

module.exports = router;