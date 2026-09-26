const jwt = require('jsonwebtoken');

const aiAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No token provided',
          code: 'NO_TOKEN'
        }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.AI_JWT_SECRET);
    console.log("SECRET FROM ENV:", process.env.AI_JWT_SECRET);
    console.log("TOKEN RECEIVED:", token);

    // 🔑 IMPORTANT: ensure this is an AI token
    if (decoded.type !== 'ai') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Invalid token type for AI route',
          code: 'INVALID_TOKEN_TYPE'
        }
      });
    }

    // Match expected req.user shape
    req.user = {
      id: decoded.id,
      role: decoded.role || 'ai',
      type: decoded.type
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid AI token',
        code: 'INVALID_TOKEN'
      }
    });
  }
};

module.exports = aiAuthMiddleware;