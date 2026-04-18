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
router.get('/events/export', exportSecurityEvents);

module.exports = router;
