const { body } = require("express-validator");

const emailField = body("email")
  .trim()
  .notEmpty()
  .withMessage("Email is required")
  .isEmail()
  .withMessage("Email must be valid")
  .normalizeEmail();

const requestResetValidator = [emailField];

const verifyResetCodeValidator = [
  emailField,
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits")
    .isNumeric()
    .withMessage("Verification code must be numeric"),
];

const resetPasswordValidator = [
  emailField,
  body("resetToken")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Reset token must be valid"),
  body("code")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits")
    .isNumeric()
    .withMessage("Verification code must be numeric"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("New password must include at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("New password must include at least one number")
    .matches(/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/)
    .withMessage("New password must include at least one special character"),
];

module.exports = {
  requestResetValidator,
  resetPasswordValidator,
  verifyResetCodeValidator,
};
