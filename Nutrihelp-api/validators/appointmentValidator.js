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


const appointmentValidatorV2 = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isInt()
    .withMessage("User ID must be an integer"),

  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must not exceed 255 characters"),

  body("doctor")
    .notEmpty()
    .withMessage("Doctor name is required")
    .isLength({ max: 255 })
    .withMessage("Doctor name must not exceed 255 characters"),

  body("type")
    .notEmpty()
    .withMessage("Appointment type is required")
    .isLength({ max: 100 })
    .withMessage("Appointment type must not exceed 100 characters"),

  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601({ strict: true })
    .withMessage("Date must be in YYYY-MM-DD format"),

  body("time")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Time must be in HH:mm format (24-hour)"),

  body("location")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Location must not exceed 255 characters"),

  body("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  body("phone")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Phone number must not exceed 50 characters"),

  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters"),

  body("reminder")
    .optional()
    .matches(/^\d+-(minute|hour|day|days)$/)
    .withMessage("Reminder must be like '1-day', '2-hours', or '30-minute'")
];

module.exports = { appointmentValidator, appointmentValidatorV2 };
