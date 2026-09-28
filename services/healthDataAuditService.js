const { logSecurityEvent } = require('./securityEventService');
const logger = require('../utils/logger');

const HEALTH_DATA_ACCESS_EVENT = 'HEALTH_DATA_ACCESS';

function getClientIp(req) {
  return (
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.ip ||
    req?.connection?.remoteAddress ||
    null
  );
}

function getRequestResource(req) {
  const requestPath = req?.originalUrl || req?.path || null;

  if (!requestPath) {
    return null;
  }

  // Do not persist query strings because they may contain sensitive values.
  return String(requestPath).split('?')[0];
}

/**
 * Persist a privacy-safe audit event when an authenticated user accesses
 * sensitive health-related information.
 *
 * Only access metadata is recorded. Sensitive health values must never be
 * included in the event metadata.
 */
async function logHealthDataAccess({
  req,
  targetUserId,
  resource,
  action = 'READ',
}) {
  const actorUserId = req?.user?.userId || null;

  if (!actorUserId || !targetUserId || !resource) {
    logger.warn('[healthDataAuditService] Audit event missing required metadata', {
      actorUserId,
      targetUserId,
      resource,
    });

    return false;
  }

  try {
    const result = await logSecurityEvent({
      event_type: HEALTH_DATA_ACCESS_EVENT,
      severity: 'low',
      user_id: actorUserId,
      ip_address: getClientIp(req),
      user_agent: req?.headers?.['user-agent'] || null,
      resource: getRequestResource(req),
      metadata: {
        action,
        resource_category: resource,
        target_user_id: targetUserId,
        request_id: req?.requestId || null,
      },
    });

    if (!result) {
      logger.error(
        '[healthDataAuditService] Failed to persist health-data access audit event',
        {
          actorUserId,
          targetUserId,
          resource,
        }
      );

      return false;
    }

    return true;
  } catch (error) {
    logger.error('[healthDataAuditService] Health-data audit logging failed', {
      actorUserId,
      targetUserId,
      resource,
      message: error.message,
    });

    return false;
  }
}

module.exports = {
  HEALTH_DATA_ACCESS_EVENT,
  logHealthDataAccess,
};
