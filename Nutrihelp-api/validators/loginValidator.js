const { body } = require('express-validator');

// Login validation
const loginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Email must be valid'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// MFA login validation
const mfaloginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Email must be valid'),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    body('mfa_token')
        .notEmpty()
        .withMessage('Token is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('Token must be 6 digits')
        .isNumeric()
        .withMessage('Token must be numeric')
];

module.exports = {
    loginValidator,
    mfaloginValidator
};
