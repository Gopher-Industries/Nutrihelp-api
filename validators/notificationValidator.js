const { body, param } = require('express-validator');

exports.validateCreateNotification = [
  body('user_id')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be an integer'),

  body('type')
    .notEmpty().withMessage('Notification type is required')
    .isString().withMessage('Type must be a string'),

  body('content')
    .notEmpty().withMessage('Notification content is required')
    .isString().withMessage('Content must be a string')
];

exports.validateUpdateNotification = [
  param('id')
    .notEmpty().withMessage('Notification ID is required')
    .isInt().withMessage('Notification ID must be an integer'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isString().withMessage('Status must be a string')
    .isIn(['read', 'unread']).withMessage('Status must be either "read" or "unread"')
];

exports.validateDeleteNotification = [
  param('id')
    .notEmpty().withMessage('Notification ID is required')
    .isInt().withMessage('Notification ID must be an integer')
];