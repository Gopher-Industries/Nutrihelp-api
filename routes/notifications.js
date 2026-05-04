const express = require('express');
const router = express.Router();
const controller = require('../controller/notificationController');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  validateCreateNotification,
  validateUpdateNotification,
  validateDeleteNotification
} = require('../validators/notificationValidator');
const validate = require('../middleware/validateRequest');

// Create a new notification → Admin only
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  validateCreateNotification,
  validate,
  controller.createNotification
);

// Get notifications by user_id → Any authenticated user (own only)
router.get(
  '/:user_id?',
  authenticateToken,
  (req, res, next) => {
    const requestedUserId = req.params.user_id || req.user.userId;
    if (req.user.role !== 'admin' && req.user.userId != requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own notifications',
        code: 'ACCESS_DENIED',
      });
    }
    req.params.user_id = requestedUserId;
    next();
  },
  controller.getNotificationsByUserId
);

// Update notification status by ID → Admin or Nutritionist
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'nutritionist'),
  validateUpdateNotification,
  validate,
  controller.updateNotificationStatusById
);

// Delete notification by ID → Admin only
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateDeleteNotification,
  validate,
  controller.deleteNotificationById
);

module.exports = router;
