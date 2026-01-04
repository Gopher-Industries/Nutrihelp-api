const authService = require('../services/authService');

/**
 * Access Token Authentication Middleware
 * - Verifies JWT access tokens only
 * - Attaches decoded user payload to req.user
 */
const authenticateToken = (req, res, next) => {


  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = authService.verifyAccessToken(token);

    // optional check
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // ✅ safer payload validation
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN'
      });

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer <token>


  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token missing',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = authService.verifyAccessToken(token);

    // Ensure only access tokens are accepted
    if (!decoded || decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }


    try {
        const decoded = authService.verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired access token",
            code: "TOKEN_INVALID"
        });

    }

    req.user = decoded; // THIS FIXES PROFILE FETCH
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired access token',
      code: 'TOKEN_INVALID'

    });
  }
};

module.exports = { authenticateToken };
