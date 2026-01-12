// rateLimiter.js
const rateLimit = require('express-rate-limit');
const errorLogService = require('./services/errorLogService');

// Helper function to handle logging for rate limit violations
const logRateLimitExceeded = (req, res, options, contextName) => {
  errorLogService.logError({
    error: new Error(`${contextName} rate limit exceeded`),
    req,
    res,
    category: 'warning',
    type: 'security',
    additionalContext: {
      limit: options.max,
      windowMs: options.windowMs,
      ip: req.ip
    }
  });
};

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Security Enhancement: Limit by User ID if authenticated, otherwise by IP 
  keyGenerator: (req) => {
    return req.user ? (req.user.userId || req.user.id) : req.ip;
  },
  // Security Enhancement: Log attempts that exceed the limit
  handler: (req, res, next, options) => {
    logRateLimitExceeded(req, res, options, 'Upload');
    res.status(options.statusCode).json({
      success: false,
      message: options.message || "Too many upload attempts, please try again later."
    });
  },
});

// Brute-force protection for authentication routes (Login/Register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitExceeded(req, res, options, 'Auth');
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again after 15 minutes."
    });
  }
});

module.exports = { uploadLimiter, authLimiter };