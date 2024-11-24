const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');

// Create a new notification
router.post('/', notificationController.createNotification);

// Get notifications by user_id
router.get('/:user_id', notificationController.getNotificationsByUserId);

// PUT /api/notifications/:id
router.put('/:id', notificationController.updateNotificationStatusById);


router.delete('/:id', notificationController.deleteNotificationById);

module.exports = router;
