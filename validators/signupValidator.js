const { body } = require('express-validator');

const registerValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 3 }).withMessage('Name should be at least 3 characters long'),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password needs a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter')
    .matches(/\d/).withMessage('Password needs a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password needs a special character'),

  body('contact_number')
    .notEmpty().withMessage('Contact number is required')
    .isMobilePhone().withMessage('Please enter a valid contact number'),

  body('address')
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 10 }).withMessage('Address should be at least 10 characters long'),
];

module.exports = { registerValidation };
