'use strict';

const express = require('express');
const router = express.Router();
const { runVerification } = require('../services/encryptionVerificationService');

/**
 * GET /api/health/encryption
 *
 * Returns the live health status of the encryption pipeline.
 * - 200: healthy or degraded (partial pass)
 * - 503: down (all checks failed)
 *
 * This endpoint intentionally does NOT require authentication so that
 * automated uptime monitors can use it.  It never exposes key material —
 * only pass/fail status and key version metadata.
 */
router.get('/', async (_req, res) => {
  try {
    const report = await runVerification();
    const httpStatus = report.status === 'down' ? 503 : 200;
    return res.status(httpStatus).json({ success: report.status !== 'down', ...report });
  } catch (err) {
    return res.status(503).json({
      success: false,
      status: 'down',
      error: 'Verification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
