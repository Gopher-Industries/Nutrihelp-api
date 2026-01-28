const authService = require('../services/authService');

/**
 * Access Token Authentication Middleware
 * - Verifies JWT access tokens only
 * - Attaches decoded user payload to req.user
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing',
        code: 'TOKEN_MISSING'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
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
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Validate payload
    if (!decoded.userId || !decoded.role) {
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
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired access token',
      code: 'TOKEN_INVALID'
    });
  }
};

module.exports = { authenticateToken };
