// rateLimiter.js
const rateLimit = require('express-rate-limit');
 
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit to 5 uploads per 10 mins
  message: {
    success: false,
    message: 'Too many uploads from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
 
module.exports = { uploadLimiter };
 