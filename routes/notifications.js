const express = require('express');
const router = express.Router();
const { authAndIdentity } = require('../controller');
const {
  validateCreateNotification,
  validateUpdateNotification,
  validateDeleteNotification
} = require('../validators/notificationValidator');

const validateResult = require('../middleware/validateRequest.js');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const { notifications: notificationController } = authAndIdentity;

// Create a new notification → Admin only
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  validateCreateNotification,
  validateResult,
  notificationController.createNotification
);

// Get notifications by user_id → Any authenticated user (but can only view their own)
router.get(
  '/:user_id?',
  authenticateToken,
  (req, res, next) => {
    const requestedUserId = req.params.user_id || req.user.userId;
    if (req.user.role !== 'admin' && req.user.userId != requestedUserId) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own notifications",
        code: "ACCESS_DENIED"
      });
    }

    req.params.user_id = requestedUserId;
    next();
  },
  notificationController.getNotificationsByUserId
);

// Update notification status by ID → Admin or Nutritionist
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'nutritionist'),
  validateUpdateNotification,
  validateResult,
  notificationController.updateNotificationStatusById
);

// Delete notification by ID → Admin only
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateDeleteNotification,
  validateResult,
  notificationController.deleteNotificationById
);

module.exports = router;
