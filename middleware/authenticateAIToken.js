const authService = require('../services/authService');

/**
 * Authentication middleware for AI traffic only.
 *
 * This middleware is intentionally separate from authenticateToken so that
 * AI routes can enforce their own token contract.
 */
const authenticateAIToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing',
        code: 'TOKEN_MISSING',
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format',
        code: 'INVALID_AUTH_HEADER',
      });
    }

    const token = parts[1];
    const decoded = authService.verifyAIToken(token);

    if (!decoded || decoded.type !== 'ai_access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN',
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: String(decoded.role).toLowerCase(),
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired AI access token',
      code: 'TOKEN_INVALID',
    });
  }
};

module.exports = { authenticateAIToken };
