const { body } = require("express-validator");

const appointmentValidator = [
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isInt()
        .withMessage("User ID must be an integer"),

    body("date")
        .notEmpty()
        .withMessage("Date is required")
        .isISO8601()
        .withMessage("Date must be in a valid ISO 8601 format (e.g., YYYY-MM-DD)"),

    body("time")
        .notEmpty()
        .withMessage("Time is required")
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage("Time must be in HH:mm format (24-hour)"),

    body("description")
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ max: 255 })
        .withMessage("Description must not exceed 255 characters"),
];

module.exports = { appointmentValidator };
