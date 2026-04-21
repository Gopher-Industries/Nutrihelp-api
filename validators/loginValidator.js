const { body } = require('express-validator');

// Login validation
const loginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Email must be valid')
        .isLength({ max: 255 })
        .withMessage('Email must be under 255 characters'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 100 })
        .withMessage('Password must be under 100 characters')
];

// MFA login validation
const mfaloginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Email must be valid')
        .isLength({ max: 255 })
        .withMessage('Email must be under 255 characters'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 100 })
        .withMessage('Password must be under 100 characters'),

    body('mfa_token')
        .notEmpty()
        .withMessage('Token is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('Token must be 6 digits')
        .isNumeric()
        .withMessage('Token must be numeric')
];

const resendMfaValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Email must be valid')
];

module.exports = {
    loginValidator,
    mfaloginValidator,
    resendMfaValidator
};
