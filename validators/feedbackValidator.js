const { body } = require('express-validator');

// Registration validation
const feedbackValidation = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 3 })
        .withMessage('Name should be at least 3 characters long'),

    body('contact_number')
        .notEmpty()
        .withMessage('Contact number is required')
        .isMobilePhone()
        .withMessage('Please enter a valid contact number'),

    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please enter a valid email'),

    body('experience')
        .notEmpty()
        .withMessage('Please define how was your experience')
        .isLength({ min: 10 })
        .withMessage('Please enter a valid feedback of at least 10 characters'),

    body("message")
        .notEmpty()
        .withMessage("A short Message is required")
        .isLength({ max: 255 })
        .withMessage("Message must not exceed 255 characters"),
];

module.exports = {
    feedbackValidation
};