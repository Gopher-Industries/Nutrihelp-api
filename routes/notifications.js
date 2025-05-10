const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const {
  validateCreateNotification,
  validateUpdateNotification,
  validateDeleteNotification
} = require('../validators/notificationValidator');

const validateResult = require('../middleware/validateRequest.js');

// Create a new notification
router.post(
  '/',
  validateCreateNotification,
  validateResult,
  notificationController.createNotification
);

// Get notifications by user_id
router.get('/:user_id', notificationController.getNotificationsByUserId);

// Update notification status by ID
router.put(
  '/:id',
  validateUpdateNotification,
  validateResult,
  notificationController.updateNotificationStatusById
);

// Delete notification by ID
router.delete(
  '/:id',
  validateDeleteNotification,
  validateResult,
  notificationController.deleteNotificationById
);

module.exports = router;
