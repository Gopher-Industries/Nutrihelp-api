const express = require("express");

const controller = require("../controller/passwordController");
const validate = require("../middleware/validateRequest");
const {
  passwordRecoveryLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimiter");
const {
  requestResetValidator,
  resetPasswordValidator,
  verifyResetCodeValidator,
} = require("../validators/passwordValidator");

const router = express.Router();

router.post(
  "/request-reset",
  passwordRecoveryLimiter,
  requestResetValidator,
  validate,
  controller.requestReset,
);

router.post(
  "/verify-code",
  passwordRecoveryLimiter,
  verifyResetCodeValidator,
  validate,
  controller.verifyCode,
);

router.post(
  "/reset",
  passwordResetLimiter,
  resetPasswordValidator,
  validate,
  controller.resetPassword,
);

module.exports = router;
