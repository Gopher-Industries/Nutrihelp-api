// routes/securityEvents.js

const express = require('express');
const router = express.Router();

const {
  exportSecurityEvents,
} = require('../controller/securityEventsController');

// GET /security/events/export
router.get('/events/export', exportSecurityEvents);

module.exports = router;
