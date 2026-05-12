const authService = require('../services/authService');
const logger = require('../utils/logger');
const { supabaseService } = require('../services/supabaseClient');
const { recordAuthInvalidTokenAttempt } = require('../Monitor_&_Logging/metrics');
const {
  getActiveBlock,
  registerAuthFailure,
} = require('../services/securityEvents/securityResponseService');

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};

const getCurrentUserRole = async (userId) => {
  if (!supabaseService || !userId) return null;

  const { data, error } = await supabaseService
    .from('users')
    .select('user_id,email,role_id,user_roles!left(role_name)')
    .eq('user_id', Number(userId))
    .maybeSingle();

  if (error || !data) {
    logger.warn('Failed to refresh user role from database', {
      userId,
      message: error?.message || 'user_not_found',
    });
    return null;
  }

  return {
    email: data.email || null,
    role: data.user_roles?.role_name || null,
  };
};

/**
 * Access Token Authentication Middleware
 * - Verifies JWT access tokens only
 * - Attaches decoded user payload to req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const ip = getClientIp(req);
    const activeBlock = getActiveBlock(req);

    if (activeBlock) {
      logger.warn('Blocked request rejected during token authentication', {
        route: req.path,
        ip,
        eventType: activeBlock.eventType,
      });
      return res.status(429).json({
        success: false,
        error: 'This IP has been temporarily blocked for security reasons.',
        code: 'SECURITY_TEMPORARY_BLOCK',
        blockedUntil: activeBlock.expiresAt,
      });
    }

    if (!authHeader) {
      recordAuthInvalidTokenAttempt({
        route: req.path,
        ip,
        reason: 'TOKEN_MISSING',
      });
      await registerAuthFailure(req, { reason: 'TOKEN_MISSING' });
      logger.warn('Authorization header missing', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: "Authorization header missing",
        code: "TOKEN_MISSING",
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      recordAuthInvalidTokenAttempt({
        route: req.path,
        ip,
        reason: 'INVALID_AUTH_HEADER',
      });
      await registerAuthFailure(req, { reason: 'INVALID_AUTH_HEADER' });
      logger.warn('Invalid authorization header format', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: "Invalid authorization format",
        code: "INVALID_AUTH_HEADER",
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
      await registerAuthFailure(req, { reason: 'INVALID_TOKEN_TYPE' });
      logger.warn('Invalid token type detected', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: "Invalid token type",
        code: "INVALID_TOKEN_TYPE",
      });
    }

    // Validate payload
    if (!decoded.userId || !decoded.role) {
      recordAuthInvalidTokenAttempt({
        route: req.path,
        ip,
        reason: 'INVALID_TOKEN',
      });
      await registerAuthFailure(req, { reason: 'INVALID_TOKEN' });
      logger.warn('Invalid token payload', { route: req.path, ip });
      return res.status(401).json({
        success: false,
        error: "Invalid token payload",
        code: "INVALID_TOKEN",
      });
    }

    const currentUser = await getCurrentUserRole(decoded.userId);
    const currentRole = currentUser?.role || decoded.role;

    if (!currentRole) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token role',
        code: 'INVALID_TOKEN_ROLE'
      });
    }

    // Attach user to request. Role is refreshed from DB so role changes take
    // effect immediately and stale JWT role claims cannot keep old access.
    req.user = {
      userId: decoded.userId,
      email: currentUser?.email || decoded.email,
      role: String(currentRole).toLowerCase()
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
    await registerAuthFailure(req, { reason });
    logger.warn('Access token verification failed', {
      route: req.path,
      ip,
      reason,
      message: error?.message,
    });
    return res.status(401).json({
      success: false,
      error: "Invalid or expired access token",
      code: "TOKEN_INVALID",
      requestId: req.requestId,
    });
  }
};

module.exports = { authenticateToken };
