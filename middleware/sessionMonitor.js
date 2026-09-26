const {
  recordRefreshRequest,
  recordAuthenticatedSession,
} = require('../Monitor_&_Logging/metrics');

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};

/**
 * Monitor every request for session activity and token-related patterns.
 */
const sessionMonitorMiddleware = (req, res, next) => {
  const route = req.path;
  const ip = getClientIp(req);
  const sessionId = req.headers['x-session-id'] || req.sessionID || null;

  req.sessionId = sessionId;
  req.clientIp = ip;

  res.on('finish', () => {
    if (req.user) {
      recordAuthenticatedSession({
        userId: req.user.userId,
        route,
        sessionId,
        ip,
        status: res.statusCode,
      });
    }

    if (route === '/api/auth/refresh') {
      recordRefreshRequest({
        userId: req.user?.userId,
        route,
        status: res.statusCode,
        ip,
      });
    }
  });

  next();
};

module.exports = {
  sessionMonitorMiddleware,
};
