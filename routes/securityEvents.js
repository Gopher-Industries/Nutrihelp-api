// routes/securityEvents.js

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const {
  exportSecurityEvents,
} = require('../controller/securityEventsController');

// GET /security/events/export
// Only admins should be able to export security events
router.get('/events/export', authenticateToken, authorizeRoles('admin'), exportSecurityEvents);

module.exports = router;
