const express = require('express');
const router = express.Router();
const { checkFileIntegrity, generateBaseline } = require('../tools/integrity/integrityService');
const testErrorRouter = require('./testError');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  createBlockMiddleware,
  getActiveBlocks,
  getClientIp,
  unblockIp,
} = require('../services/securityEvents/securityResponseService');

const ADMIN_RECOVERY_HEADER = 'x-system-recovery-key';

function parseBearerToken(authHeader = '') {
  const parts = String(authHeader).split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

function authorizeAdminOrRecovery(req, res, next) {
  const expectedRecoveryKey = String(process.env.SYSTEM_RECOVERY_KEY || '').trim();
  const providedRecoveryKey = String(req.headers[ADMIN_RECOVERY_HEADER] || '').trim();

  if (expectedRecoveryKey && providedRecoveryKey && providedRecoveryKey === expectedRecoveryKey) {
    req.systemAuthMode = 'recovery_key';
    return next();
  }

  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Missing authentication token or recovery key',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const decoded = authService.verifyAccessToken(token);
    const role = String(decoded?.role || '').trim().toLowerCase();
    if (decoded?.type !== 'access' || role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges are required',
        code: 'FORBIDDEN',
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    req.systemAuthMode = 'admin_token';
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired access token',
      code: 'TOKEN_INVALID',
    });
  }
}

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

/**
 * @swagger
 * /api/system/unblock-ip:
 *   post:
 *     summary: Remove temporary security IP block
 *     tags: [System]
 *     description: |
 *       Accepts either admin Bearer token or x-system-recovery-key header.
 *       If body.ip is not provided, the caller IP is used.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ip:
 *                 type: string
 *                 example: 203.0.113.1
 *     responses:
 *       200:
 *         description: IP unblocked
 *       404:
 *         description: IP is not currently blocked
 */
router.post('/unblock-ip', authorizeAdminOrRecovery, (req, res) => {
  const explicitIp = typeof req.body?.ip === 'string' ? req.body.ip.trim() : '';
  const targetIp = explicitIp || getClientIp(req);
  const result = unblockIp(targetIp);

  if (!result.unblocked) {
    return res.status(404).json({
      success: false,
      code: result.reason,
      message: `IP ${result.ip || targetIp} is not currently blocked`,
      ip: result.ip || targetIp,
      authMode: req.systemAuthMode,
      activeBlocks: getActiveBlocks().length,
    });
  }

  return res.status(200).json({
    success: true,
    code: result.reason,
    message: `IP ${result.ip} has been unblocked`,
    ip: result.ip,
    releasedBlock: result.block,
    authMode: req.systemAuthMode,
    activeBlocks: getActiveBlocks().length,
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
