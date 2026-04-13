const authService = require('../services/authService');
const logger = require('../utils/logger');
const { recordAuthInvalidTokenAttempt } = require('../Monitor_&_Logging/metrics');

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};

/**
 * Access Token Authentication Middleware
 * - Verifies JWT access tokens only
 * - Attaches decoded user payload to req.user
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const ip = getClientIp(req);

    if (!authHeader) {
      recordAuthInvalidTokenAttempt({
        route: req.path,
        ip,
        reason: 'TOKEN_MISSING',
      });
      logger.warn('Authorization header missing', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing',
        code: 'TOKEN_MISSING'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      recordAuthInvalidTokenAttempt({
        route: req.path,
        ip,
        reason: 'INVALID_AUTH_HEADER',
      });
      logger.warn('Invalid authorization header format', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format',
        code: 'INVALID_AUTH_HEADER'
      });
    }

    const token = parts[1];

    const decoded = authService.verifyAccessToken(token);

    // Ensure only access tokens are accepted
    if (!decoded || decoded.type !== 'access') {
      recordAuthInvalidTokenAttempt({
        route: req.path,
        ip,
        reason: 'INVALID_TOKEN_TYPE',
      });
      logger.warn('Invalid token type detected', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Validate payload
    if (!decoded.userId || !decoded.role) {
      recordAuthInvalidTokenAttempt({
        route: req.path,
        ip,
        reason: 'INVALID_TOKEN',
      });
      logger.warn('Invalid token payload', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN'
      });
    }

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    const ip = getClientIp(req);
    const reason = error?.name || 'TOKEN_INVALID';
    recordAuthInvalidTokenAttempt({
      route: req.path,
      ip,
      reason,
    });
    logger.warn('Access token verification failed', {
      route: req.path,
      ip,
      reason,
      message: error?.message,
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired access token',
      code: 'TOKEN_INVALID'
    });
  }
};

module.exports = { authenticateToken };
