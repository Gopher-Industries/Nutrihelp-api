const express = require('express');
const router = express.Router();
const { checkFileIntegrity, generateBaseline } = require('../tools/integrity/integrityService');
const testErrorRouter = require('./testError');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  createBlockMiddleware,
} = require('../services/securityEvents/securityResponseService');
const { buildOverview } = require('../services/integrationAuditService');
const {
  getLiveOverview,
  getLiveAuditState,
} = require('../services/liveAuditService');

function isLocalRequest(req) {
  const ip = req.ip || req.connection?.remoteAddress || '';
  const forwarded = req.headers['x-forwarded-for'] || '';
  const candidates = [ip, forwarded]
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return candidates.some((value) =>
    value === '127.0.0.1'
    || value === '::1'
    || value === '::ffff:127.0.0.1'
    || value.startsWith('192.168.')
    || value.startsWith('10.')
  );
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

if (process.env.NODE_ENV !== 'production') {
  router.get('/dev/live-audit/overview', async (req, res) => {
    if (!isLocalRequest(req)) {
      return res.status(403).json({
        success: false,
        error: 'This development endpoint is restricted to local requests.',
        code: 'LOCAL_ONLY_ENDPOINT',
      });
    }

    try {
      const overview = await getLiveOverview();
      res.status(200).json({
        success: true,
        data: overview,
        meta: {
          mode: 'dev-live',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to build live integration audit overview',
        code: 'LIVE_AUDIT_FAILED',
        details: error.message,
      });
    }
  });

  router.get('/dev/integration-audit/overview', async (req, res) => {
    if (!isLocalRequest(req)) {
      return res.status(403).json({
        success: false,
        error: 'This development endpoint is restricted to local requests.',
        code: 'LOCAL_ONLY_ENDPOINT',
      });
    }

    try {
      const overview = await buildOverview();
      res.status(200).json({
        success: true,
        data: overview,
        meta: {
          mode: 'dev-local',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to build integration audit overview',
        code: 'INTEGRATION_AUDIT_FAILED',
        details: error.message,
      });
    }
  });
}

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

router.get('/integration-audit/overview', async (req, res) => {
  try {
    const overview = await buildOverview();
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to build integration audit overview',
      code: 'INTEGRATION_AUDIT_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

router.get('/live-audit/overview', async (req, res) => {
  try {
    const overview = await getLiveOverview();
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to build live integration audit overview',
      code: 'LIVE_AUDIT_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

router.post('/live-audit/run', async (req, res) => {
  try {
    const overview = await getLiveOverview({ force: true });
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh live integration audit overview',
      code: 'LIVE_AUDIT_REFRESH_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

router.get('/live-audit/state', async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: getLiveAuditState(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load live audit state',
      code: 'LIVE_AUDIT_STATE_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

router.get('/integration-audit/routes', async (req, res) => {
  try {
    const overview = await buildOverview();
    res.status(200).json({
      success: true,
      data: {
        routeAudit: overview.routeAudit,
        unusedRoutes: overview.unusedRoutes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load route audit data',
      code: 'INTEGRATION_AUDIT_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

router.get('/integration-audit/errors', async (req, res) => {
  try {
    const overview = await buildOverview();
    res.status(200).json({
      success: true,
      data: {
        recentErrors: overview.recentErrors,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load recent errors',
      code: 'INTEGRATION_AUDIT_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});


module.exports = router;
