require("dotenv").config();

const authService = require('../services/authService');
const {
  createSuccessResponse,
  createErrorResponse,
  formatProfile,
  formatSession
} = require('../services/apiResponseService');

const {
  authOk,
  authFail,
  authFailFromError,
  AUTH_ERROR_CODES,
} = require('../services/authResponse');

const { isServiceError } = require('../services/serviceError');
const logger = require('../utils/logger');
const { tokenHookOnIssue, tokenHookOnRefresh, tokenHookOnRevoke } = require('../services/tokenLogService');

// ✅ ADD THIS (AUDIT)
const sendWithRetry = require("../utils/auditSender");

const TRUSTED_DEVICE_COOKIE = authService.trustedDeviceCookieName || 'trusted_device';

function getDeviceInfo(req) {
  return {
    ip: req.ip,
    userAgent: req.get('User-Agent') || 'Unknown',
    deviceId: req.get('X-Device-Id') || null,
    clientType: req.get('X-Client-Type') || 'web'
  };
}

function clearTrustedDeviceCookie(res) {
  if (!res?.clearCookie) return;

  res.clearCookie(TRUSTED_DEVICE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

function handleServiceError(res, error, fallbackStatus, fallbackCode, label, context = {}) {

  // ✅ AUDIT FAIL
  if (res.req && res.req.auditData) {
    res.req.auditData.status = "fail";
    res.req.auditData.errorType = error.name || "SERVICE_ERROR";
    sendWithRetry(res.req.auditData);
  }

  if (isServiceError(error)) {
    return res.status(error.statusCode).json(
      createErrorResponse(error.message, fallbackCode, error.details || undefined)
    );
  }

  logger.error(label, { error: error.message, ...context });

  return res.status(fallbackStatus).json(
    createErrorResponse(error.message || 'Internal server error', fallbackCode)
  );
}

/**
 * REGISTER
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, first_name, last_name } = req.body;

    if (!name || !email || !password) {

      req.auditData.status = "fail";
      req.auditData.errorType = "VALIDATION_ERROR";
      req.auditData.fields = ["name", "email", "password"];
      sendWithRetry(req.auditData);

      return res.status(400).json(
        createErrorResponse('Name, email, and password are required', 'VALIDATION_ERROR')
      );
    }

    const result = await authService.register({
      name,
      email,
      password,
      first_name,
      last_name
    });

    req.auditData.status = "success";
    sendWithRetry(req.auditData);

    return res.status(201).json(createSuccessResponse({
      user: {
        id: result.user?.user_id || null,
        email: result.user?.email || email,
        name: result.user?.name || name
      }
    }, {
      message: result.message || 'User registered successfully'
    }));

  } catch (error) {
    return handleServiceError(res, error, 400, 'REGISTER_FAILED', 'Registration error', {
      email: req.body.email
    });
  }
};

/**
 * LOGIN ✅ (MAIN AUDIT FLOW)
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {

      req.auditData.status = "fail";
      req.auditData.errorType = "VALIDATION_ERROR";
      req.auditData.fields = ["email", "password"];
      sendWithRetry(req.auditData);

      return res.status(400).json(
        createErrorResponse('Email and password are required', 'VALIDATION_ERROR')
      );
    }

    const result = await authService.login({ email, password }, getDeviceInfo(req));

    req.auditData.status = "success";
    sendWithRetry(req.auditData);

    return res.json(createSuccessResponse({
      user: result.user,
      session: formatSession(result)
    }));

  } catch (error) {

    req.auditData.status = "fail";
    req.auditData.errorType = error.name || "LOGIN_ERROR";
    req.auditData.fields = Object.keys(req.body || {});
    sendWithRetry(req.auditData);

    return handleServiceError(res, error, 401, 'AUTHENTICATION_FAILED', 'Login error', {
      email: req.body.email
    });
  }
};

/**
 * REFRESH TOKEN
 */
exports.refreshToken = async (req, res) => {
  try {
    if (!req.body.refreshToken) {

      req.auditData.status = "fail";
      req.auditData.errorType = "MISSING_REFRESH_TOKEN";
      sendWithRetry(req.auditData);

      return authFail(res, {
        message: 'Refresh token is required',
        code: AUTH_ERROR_CODES.MISSING_FIELDS,
        status: 400,
      });
    }

    const result = await authService.refreshAccessToken(req.body.refreshToken, getDeviceInfo(req));

    try {
      if (result && result.accessToken && result.userId) {
        await tokenHookOnRefresh(req, { user_id: result.userId }, result.refreshToken);
      }
    } catch (hookErr) {
      logger.warn('tokenHookOnRefresh failed:', hookErr.message);
    }

    req.auditData.status = "success";
    sendWithRetry(req.auditData);

    return authOk(res, { session: formatSession(result) });

  } catch (error) {
    return handleServiceError(res, error, 500, 'REFRESH_FAILED', 'Refresh error');
  }
};

/**
 * LOGOUT
 */
exports.logout = async (req, res) => {
  try {
    const result = await authService.logout(req.body.refreshToken);

    req.auditData.status = "success";
    sendWithRetry(req.auditData);

    return res.json(createSuccessResponse(null, {
      message: result.message
    }));

  } catch (error) {
    return handleServiceError(res, error, 500, 'LOGOUT_FAILED', 'Logout error');
  }
};

/**
 * PROFILE
 */
exports.getProfile = async (req, res) => {
  try {
    const result = await authService.getProfile(req.user.userId);

    req.auditData.status = "success";
    sendWithRetry(req.auditData);

    return res.json(createSuccessResponse({
      user: formatProfile(result.user)
    }));

  } catch (error) {
    return handleServiceError(res, error, 500, 'PROFILE_ERROR', 'Profile error');
  }
};