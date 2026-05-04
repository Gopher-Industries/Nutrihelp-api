const authService = require('../services/authService');
const {
  createSuccessResponse,
  createErrorResponse,
  formatProfile,
  formatSession
} = require('../services/apiResponseService');
const { isServiceError } = require('../services/serviceError');
const logger = require('../utils/logger');

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
  if (!res?.clearCookie) {
    return;
  }

  res.clearCookie(TRUSTED_DEVICE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

function handleServiceError(res, error, fallbackStatus, fallbackCode, label, context = {}) {
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

exports.register = async (req, res) => {
  try {
    const { name, email, password, first_name, last_name } = req.body;

    if (!name || !email || !password) {
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

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse('Email and password are required', 'VALIDATION_ERROR')
      );
    }

    const result = await authService.login({ email, password }, getDeviceInfo(req));

    return res.json(createSuccessResponse({
      user: result.user,
      session: formatSession(result)
    }));
  } catch (error) {
    return handleServiceError(res, error, 401, 'AUTHENTICATION_FAILED', 'Login error', {
      email: req.body.email
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json(
        createErrorResponse('Refresh token is required', 'VALIDATION_ERROR')
      );
    }

    const result = await authService.refreshAccessToken(refreshToken, getDeviceInfo(req));

    return res.json(createSuccessResponse({
      session: formatSession(result)
    }));
  } catch (error) {
    return handleServiceError(res, error, 401, 'REFRESH_FAILED', 'Token refresh error');
  }
};

exports.googleExchange = async (req, res) => {
  try {
    const supabaseAccessToken = req.body.supabaseAccessToken || req.body.accessToken || req.body.token;
    const provider = req.body.provider || 'google';

    const result = await authService.exchangeSupabaseToken(
      { supabaseAccessToken, provider },
      getDeviceInfo(req)
    );

    return res.json(result);
  } catch (error) {
    logger.error('Google exchange error', { error: error.message });
    return handleServiceError(res, error, 401, 'Google exchange error:');
  }
};

exports.logout = async (req, res) => {
  try {
    const result = await authService.logout(req.body.refreshToken);
    return res.json(createSuccessResponse(null, {
      message: result.message
    }));
  } catch (error) {
    return handleServiceError(res, error, 500, 'LOGOUT_FAILED', 'Logout error', {
      userId: req.user?.userId
    });
  }
};

exports.logoutAll = async (req, res) => {
  try {
    const result = await authService.logoutAll(req.user.userId, {
      reason: 'logout_all',
      deviceInfo: getDeviceInfo(req)
    });

    clearTrustedDeviceCookie(res);
    return res.json(createSuccessResponse(null, {
      message: result.message
    }));
  } catch (error) {
    return handleServiceError(res, error, 500, 'LOGOUT_ALL_FAILED', 'Logout all error', {
      userId: req.user?.userId
    });
  }
};

exports.revokeTrustedDevices = async (req, res) => {
  try {
    const result = await authService.revokeTrustedDevices(
      req.user.userId,
      'manual',
      getDeviceInfo(req)
    );

    clearTrustedDeviceCookie(res);
    return res.json(createSuccessResponse({
      revokedCount: result.revokedCount
    }, {
      message: 'Trusted devices revoked successfully'
    }));
  } catch (error) {
    return handleServiceError(
      res,
      error,
      500,
      'TRUSTED_DEVICE_REVOKE_FAILED',
      'Revoke trusted devices error',
      { userId: req.user?.userId }
    );
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await authService.getProfile(req.user.userId);
    return res.json(createSuccessResponse({
      user: formatProfile(result.user)
    }));
  } catch (error) {
    const code = error.statusCode === 404 ? 'USER_NOT_FOUND' : 'PROFILE_LOAD_FAILED';
    return handleServiceError(res, error, error.statusCode || 500, code, 'Get profile error', {
      userId: req.user?.userId
    });
  }
};

exports.logLoginAttempt = async (req, res) => {
  try {
    const result = await authService.logLoginAttempt({
      email: req.body.email,
      userId: req.body.user_id,
      success: req.body.success,
      ipAddress: req.body.ip_address,
      createdAt: req.body.created_at
    });

    return res.status(201).json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    logger.error('Failed to insert login log', { error: error.message, email: req.body.email });
    return res.status(500).json({ error: 'Failed to log login attempt' });
  }
};

exports.sendSMSByEmail = async (req, res) => {
  try {
    const result = await authService.sendSmsCodeByEmail(req.body.email);
    return res.status(200).json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    logger.error('Error sending SMS', { error: error.message, email: req.body.email });
    return res.status(500).json({ error: 'Internal server error' });
  }
};
