const rateLimit = require('express-rate-limit');

// For login and MFA
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: {
    status: 429,
    error: "Too many login attempts, please try again after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const mfaResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    error: "Too many MFA resend attempts, please try again after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: {
    status: 429,
    error: "Too many password recovery attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 429,
    error: "Too many password reset attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// For signup
const signupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    status: 429,
    error: "Too many signup attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// For contact us and feedback forms
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    status: 429,
    error: "Too many form submissions from this IP, please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  formLimiter,
  // For sensitive password verification / change flows
  passwordChangeLimiter: rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip,
    message: {
      status: 429,
      error: "Too many password verification attempts. Please try again later.",
      code: "RATE_LIMITED",
    },
  }),
  mfaResendLimiter,
  passwordRecoveryLimiter,
  passwordResetLimiter,
  signupLimiter,
};
