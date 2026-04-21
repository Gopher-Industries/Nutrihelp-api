// routes/securityEvents.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  createBlockMiddleware,
} = require('../services/securityEvents/securityResponseService');
const {
  exportSecurityEvents,
} = require('../controller/securityEventsController');

// BE23 Hardening: Block, Auth, and Admin Role enforcement on ALL security routes
router.use(createBlockMiddleware());
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

/**
 * @swagger
 * /api/security/events/export:
 *   get:
 *     summary: Export all security events
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security events exported successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */

// GET /api/security/events/export
router.get('/events/export', exportSecurityEvents);

/**
 * @swagger
 * /api/security/logs:
 *   get:
 *     summary: Retrieve system security logs
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */

// GET /api/security/logs (Merged from legacy securtiy.js)
router.get('/logs', (req, res) => {
  res.status(200).json({ message: "System security logs retrieved" });
});

module.exports = router;