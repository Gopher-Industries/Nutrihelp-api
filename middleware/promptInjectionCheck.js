const logger = require('../utils/logger');

const SUSPICIOUS_PATTERNS = [
  /ignore (all )?(previous|above) instructions/i,
  /disregard (your|the) (system )?prompt/i,
  /reveal (your|the) (system )?prompt/i,
  /you are now (a|an)/i,
  /pretend (you are|to be)/i,
  /jailbreak/i,
];

function checkPromptInjection(req, res, next) {
  const message = req.body?.user_input || '';
  const flagged = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(message));

  if (flagged) {
    logger.warn('Potential prompt injection attempt flagged', {
      userId: req.user?.userId || 'anonymous',
      ip: req.ip,
    });
  }

  req.injectionFlagged = flagged;
  next();
}

module.exports = checkPromptInjection;
