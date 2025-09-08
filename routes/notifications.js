const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const {
  validateCreateNotification,
  validateUpdateNotification,
  validateDeleteNotification
} = require('../validators/notificationValidator');

const validateResult = require('../middleware/validateRequest.js');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

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
  '/:user_id',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.userId != req.params.user_id) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own notifications",
        code: "ACCESS_DENIED"
      });
    }
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