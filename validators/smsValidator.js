const { body } = require('express-validator');

const sendValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const verifyValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
];

module.exports = { sendValidator, verifyValidator };