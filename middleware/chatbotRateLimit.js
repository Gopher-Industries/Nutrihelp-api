const rateLimit = require('express-rate-limit');

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { error: 'Too many chatbot requests. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = chatbotLimiter;
