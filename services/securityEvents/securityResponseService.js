const logger = require('../../utils/logger');
const authService = require('../authService');

const WINDOW_MS = 10 * 60 * 1000;
const IP_BLOCK_MS = 15 * 60 * 1000;

const EVENT_CONFIG = {
  auth_failure: {
    threshold: 8,
    eventCode: 'AUTH_FAILURE_THRESHOLD_EXCEEDED',
    blockMessage: 'Too many authentication failures detected from this IP.',
  },
  rbac_violation: {
    threshold: 5,
    eventCode: 'RBAC_VIOLATION_THRESHOLD_EXCEEDED',
    blockMessage: 'Too many permission denials detected from this IP.',
  },
  upload_abuse: {
    threshold: 3,
    eventCode: 'UPLOAD_ABUSE_THRESHOLD_EXCEEDED',
    blockMessage: 'Too many abusive upload attempts detected from this IP.',
  },
};

const eventBuckets = new Map();
const blockedIps = new Map();

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

const isLocalhostRequest = (req) => {
  if (process.env.NODE_ENV === 'production') return false;
  const ip =
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.ip ||
    req?.connection?.remoteAddress ||
    '';
  return LOOPBACK_IPS.has(ip);
};

const getClientIp = (req) => {
  return (
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.ip ||
    req?.connection?.remoteAddress ||
    'unknown'
  );
};

const getBucketKey = (eventType, req, subject) => {
  const ip = getClientIp(req);
  return `${eventType}:${subject || req?.user?.userId || ip}`;
};

const pruneBuckets = () => {
  const now = Date.now();
  for (const [key, entry] of eventBuckets.entries()) {
    if (now - entry.start > WINDOW_MS * 2) {
      eventBuckets.delete(key);
    }
  }
};

const pruneBlocks = () => {
  const now = Date.now();
  for (const [ip, entry] of blockedIps.entries()) {
    if (entry.expiresAt <= now) {
      blockedIps.delete(ip);
    }
  }
};

const tickBucket = (eventType, req, subject) => {
  const key = getBucketKey(eventType, req, subject);
  const now = Date.now();
  const current = eventBuckets.get(key);

  if (!current || now - current.start > WINDOW_MS) {
    const next = { count: 1, start: now };
    eventBuckets.set(key, next);
    return next.count;
  }

  current.count += 1;
  return current.count;
};

const blockIp = ({ ip, eventType, metadata = {} }) => {
  const expiresAt = Date.now() + IP_BLOCK_MS;
  blockedIps.set(ip, {
    eventType,
    expiresAt,
    metadata,
  });

  logger.warn('Applied temporary security IP block', {
    ip,
    eventType,
    expiresAt: new Date(expiresAt).toISOString(),
    ...metadata,
  });
};

const triggerAccountProtection = async ({ req, eventType, metadata = {} }) => {
  const userId = req?.user?.userId || metadata.userId;
  if (!userId) {
    return;
  }

  try {
    await authService.logoutAll(userId, {
      reason: `security_response:${eventType}`,
      deviceInfo: {
        ip: getClientIp(req),
        userAgent: req?.headers?.['user-agent'] || 'unknown',
      },
    });

    logger.warn('Revoked active sessions after security threshold breach', {
      userId,
      eventType,
      route: req?.originalUrl || req?.path,
    });
  } catch (error) {
    logger.logError('Failed to revoke sessions during security response', error, {
      userId,
      eventType,
    });
  }
};

const registerEvent = async ({ eventType, req, subject, metadata = {} }) => {
  const config = EVENT_CONFIG[eventType];
  if (!config) {
    return { triggered: false };
  }

  const ip = getClientIp(req);
  const count = tickBucket(eventType, req, subject);
  pruneBuckets();
  pruneBlocks();

  if (count !== config.threshold) {
    return { triggered: false, count };
  }

  blockIp({
    ip,
    eventType,
    metadata: {
      eventCode: config.eventCode,
      route: req?.originalUrl || req?.path,
      ...metadata,
    },
  });

  await triggerAccountProtection({ req, eventType, metadata });

  return {
    triggered: true,
    count,
    eventCode: config.eventCode,
    expiresAt: new Date(Date.now() + IP_BLOCK_MS).toISOString(),
  };
};

const getActiveBlock = (req) => {
  pruneBlocks();
  const ip = getClientIp(req);
  const block = blockedIps.get(ip);

  if (!block) {
    return null;
  }

  return {
    ip,
    eventType: block.eventType,
    expiresAt: new Date(block.expiresAt).toISOString(),
    metadata: block.metadata,
  };
};

const createBlockMiddleware = () => {
  return (req, res, next) => {
    if (isLocalhostRequest(req)) return next();

    const block = getActiveBlock(req);
    if (!block) {
      return next();
    }

    const config = EVENT_CONFIG[block.eventType] || {};
    return res.status(429).json({
      success: false,
      error: config.blockMessage || 'This IP has been temporarily blocked for security reasons.',
      code: 'SECURITY_TEMPORARY_BLOCK',
      blockedUntil: block.expiresAt,
    });
  };
};

const resetForTests = () => {
  eventBuckets.clear();
  blockedIps.clear();
};

module.exports = {
  __resetForTests: resetForTests,
  createBlockMiddleware,
  getActiveBlock,
  getClientIp,
  registerAuthFailure: (req, metadata = {}) =>
    registerEvent({ eventType: 'auth_failure', req, metadata }),
  registerRbacViolation: (req, metadata = {}) =>
    registerEvent({ eventType: 'rbac_violation', req, subject: req?.user?.userId, metadata }),
  registerUploadAbuse: (req, metadata = {}) =>
    registerEvent({ eventType: 'upload_abuse', req, subject: req?.user?.userId, metadata }),
};
