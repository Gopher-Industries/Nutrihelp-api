const { validationResult } = require("express-validator");

const passwordResetService = require("../services/passwordResetService");
const {
  authOk,
  authFailFromError,
  authValidationError,
  AUTH_ERROR_CODES,
} = require("../services/authResponse");

function getDeviceInfo(req) {
  return {
    ip: req.ip,
    userAgent: req.get("User-Agent") || "Unknown",
  };
}

/**
 * Some upstream services already return a `{ success, message, ... }` shape.
 * This helper lifts the message into the canonical envelope's meta and the
 * remaining keys into `data` so we never double-wrap or leak the legacy shape.
 */
function unwrapServiceResult(result) {
  if (!result || typeof result !== "object") {
    return { data: null, message: undefined };
  }
  const { success: _ignored, message, ...rest } = result;
  return {
    data: Object.keys(rest).length ? rest : null,
    message,
  };
}

exports.requestReset = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return authValidationError(res, errors.array());
  }

  try {
    const result = await passwordResetService.requestReset(
      req.body.email,
      getDeviceInfo(req)
    );
    const { data, message } = unwrapServiceResult(result);
    return authOk(res, data, { message });
  } catch (error) {
    return authFailFromError(res, error, {
      code: AUTH_ERROR_CODES.RESET_REQUEST_FAILED,
      message: "Unable to request password reset",
    });
  }
};

exports.verifyCode = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return authValidationError(res, errors.array());
  }

  try {
    const result = await passwordResetService.verifyCode(
      req.body.email,
      req.body.code
    );
    const { data, message } = unwrapServiceResult(result);
    return authOk(res, data, { message });
  } catch (error) {
    return authFailFromError(res, error, {
      code: AUTH_ERROR_CODES.RESET_CODE_INVALID,
      message: "Unable to verify reset code",
    });
  }
};

exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return authValidationError(res, errors.array());
  }

  try {
    const result = await passwordResetService.resetPassword({
      email: req.body.email,
      resetToken: req.body.resetToken,
      code: req.body.code,
      newPassword: req.body.newPassword,
    });
    const { data, message } = unwrapServiceResult(result);
    return authOk(res, data, { message });
  } catch (error) {
    return authFailFromError(res, error, {
      code: AUTH_ERROR_CODES.RESET_FAILED,
      message: "Unable to reset password",
    });
  }
};
