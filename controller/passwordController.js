const { validationResult } = require("express-validator");

const passwordResetService = require("../services/passwordResetService");

function getDeviceInfo(req) {
  return {
    ip: req.ip,
    userAgent: req.get("User-Agent") || "Unknown",
  };
}

function validationError(res, errors) {
  return res.status(400).json({
    success: false,
    error: "Validation failed",
    errors: errors.array(),
  });
}

exports.requestReset = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors);
  }

  try {
    const result = await passwordResetService.requestReset(
      req.body.email,
      getDeviceInfo(req),
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "Unable to request password reset",
    });
  }
};

exports.verifyCode = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors);
  }

  try {
    const result = await passwordResetService.verifyCode(
      req.body.email,
      req.body.code,
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "Unable to verify reset code",
    });
  }
};

exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors);
  }

  try {
    const result = await passwordResetService.resetPassword({
      email: req.body.email,
      resetToken: req.body.resetToken,
      code: req.body.code,
      newPassword: req.body.newPassword,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "Unable to reset password",
    });
  }
};
