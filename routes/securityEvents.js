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

router.use(createBlockMiddleware());
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// GET /security/events/export
// Only admins should be able to export security events
router.get('/events/export', authenticateToken, authorizeRoles('admin'), exportSecurityEvents);

module.exports = router;
