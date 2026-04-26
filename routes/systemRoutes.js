const express = require('express');
const router = express.Router();
const { checkFileIntegrity, generateBaseline } = require('../tools/integrity/integrityService');
const testErrorRouter = require('./testError');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  createBlockMiddleware,
} = require('../services/securityEvents/securityResponseService');

// Public health check (no auth required)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'nutrihelp-api',
    nodeEnv: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    pythonCommand: process.env.PYTHON_BIN || 'python3',
    timestamp: new Date().toISOString()
  });
});

// All routes below require auth + admin role
router.use(createBlockMiddleware());
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

/**
 * @swagger
 * /api/system/generate-baseline:
 *   post:
 *     summary: Regenerate baseline hash data for file integrity checks
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Baseline regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fileCount:
 *                   type: integer
 */

/**
 * @swagger
 * /api/system/integrity-check:
 *   get:
 *     summary: Run file integrity and anomaly check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: List of file anomalies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 anomalies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       file:
 *                         type: string
 *                       issue:
 *                         type: string
 */

router.post('/generate-baseline', (req, res) => {
  try {
    const result = generateBaseline();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate baseline", details: err.message });
  }
});

router.get('/integrity-check', (req, res) => {
  try {
    const anomalies = checkFileIntegrity();
    res.json({ anomalies });
  } catch (err) {
    res.status(500).json({ error: "Failed to check integrity", details: err.message });
  }
});

// Mount test error router only in development
if (process.env.NODE_ENV !== 'production') {
  router.use('/test-error', testErrorRouter);
}


module.exports = router;
