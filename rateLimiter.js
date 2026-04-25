// rateLimiter.js
const rateLimit = require('express-rate-limit');
const {
  registerUploadAbuse,
} = require('./services/securityEvents/securityResponseService');

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit to 3 uploads per 10 mins
  handler: async (req, res) => {
    await registerUploadAbuse(req, {
      reason: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    });

    return res.status(429).json({
      success: false,
      message: 'Too many uploads from this IP. Please try again later.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
 
module.exports = { uploadLimiter };
 
