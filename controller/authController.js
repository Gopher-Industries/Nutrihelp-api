const authService = require('../services/authService');
const { isServiceError } = require('../services/serviceError');

const TRUSTED_DEVICE_COOKIE = authService.trustedDeviceCookieName || 'trusted_device';

function getDeviceInfo(req) {
  return {
    ip: req.ip,
    userAgent: req.get('User-Agent') || 'Unknown'
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

function handleServiceError(res, error, fallbackStatus, fallbackLogLabel) {
  if (isServiceError(error)) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  console.error(fallbackLogLabel, error);
  return res.status(fallbackStatus).json({
    success: false,
    error: error.message || 'Internal server error'
  });
}

exports.register = async (req, res) => {
  try {
    const result = await authService.register({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      first_name: req.body.first_name,
      last_name: req.body.last_name
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleServiceError(res, error, 400, 'Registration error:');
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password
    }, getDeviceInfo(req));

    return res.json(result);
  } catch (error) {
    return handleServiceError(res, error, 401, 'Login error:');
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const result = await authService.refreshAccessToken(req.body.refreshToken, getDeviceInfo(req));
    return res.json(result);
  } catch (error) {
    return handleServiceError(res, error, 401, 'Token refresh error:');
  }
};

exports.logout = async (req, res) => {
  try {
    const result = await authService.logout(req.body.refreshToken);
    return res.json(result);
  } catch (error) {
    return handleServiceError(res, error, 500, 'Logout error:');
  }
};

exports.logoutAll = async (req, res) => {
  try {
    const result = await authService.logoutAll(req.user.userId, {
      reason: 'logout_all',
      deviceInfo: getDeviceInfo(req)
    });

    clearTrustedDeviceCookie(res);
    return res.json(result);
  } catch (error) {
    return handleServiceError(res, error, 500, 'Logout all error:');
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
    return res.json({
      success: true,
      message: 'Trusted devices revoked successfully',
      revokedCount: result.revokedCount
    });
  } catch (error) {
    return handleServiceError(res, error, 500, 'Revoke trusted devices error:');
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await authService.getProfile(req.user.userId);
    return res.json(result);
  } catch (error) {
    return handleServiceError(res, error, 500, 'Get profile error:');
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

    console.error('Failed to insert login log:', error);
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

    console.error('Error sending SMS:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
