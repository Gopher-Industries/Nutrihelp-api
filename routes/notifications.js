const express = require('express');
const router = express.Router();
const controller = require('../controller/notificationController');
const validate = require('../middleware/validate');
const { notificationQuery } = require('../validators/utilitySchemas');

// GET notifications with unread filter support
router.get('/', validate(notificationQuery, 'query'), controller.getNotifications);

// PATCH mark as read
router.patch('/:id/read', controller.markRead);

module.exports = router;
