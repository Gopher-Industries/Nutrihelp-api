const { SecurityEventType } = require('./securityEventTypes');
const { SecurityEvent } = require('./securityEventModel');
const { aggregateIncidents } = require('./securityIncidentAggregator');
const securityEventsRepository = require('../../repositories/wearable-device/securityEventsRepository');

function correlateSecurityEvents(events) {
  const incidents = aggregateIncidents(events) || [];
  return { events, incidents };
}

function inferAuditEventType(row) {
  const eventType = String(row.event_type || row.action || '').toLowerCase();
  const outcome = String(row.outcome || row.status || '').toLowerCase();

  if (eventType.includes('login') && (outcome === 'success' || eventType.includes('success'))) {
    return SecurityEventType.LOGIN_SUCCESS;
  }

  if (eventType.includes('login') && (outcome === 'failure' || outcome === 'failed' || eventType.includes('fail'))) {
    return SecurityEventType.LOGIN_FAILURE;
  }

  return SecurityEventType.ANOMALY_DETECTED;
}

async function getSecurityEvents(fromDate, toDate) {
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const events = [];

  const [
    { data: authLogs, error: authError },
    { data: bruteLogs, error: bruteError },
    { data: sessions, error: sessionError },
    { data: auditLogs, error: auditError },
    { data: errorLogs, error: errorLogError },
    { data: rbacViolationLogs, error: rbacError },
  ] = await Promise.all([
    securityEventsRepository.fetchAuthLogs(fromIso, toIso),
    securityEventsRepository.fetchBruteForceLogs(fromIso, toIso),
    securityEventsRepository.fetchUserSessions(fromIso, toIso),
    securityEventsRepository.fetchAuditLogs(fromIso, toIso),
    securityEventsRepository.fetchErrorLogs(fromIso, toIso),
    securityEventsRepository.fetchRbacViolationLogs(fromIso, toIso),
  ]);

  // ===== 1) Login events from public.auth_logs =====
  if (authError) {
    console.error('Error loading auth_logs:', authError);
  } else if (authLogs && authLogs.length > 0) {
    for (const row of authLogs) {
      const isSuccess =
        row.success === true ||
        row.outcome === 'success' ||
        row.status === 'success';

      events.push({
        ...SecurityEvent,

        id: `auth_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        type: isSuccess ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
        severity: isSuccess ? 'LOW' : 'MEDIUM',

        actor: {
          userId: row.user_id || null,
          email: row.email || null,
          role: null,
        },

        network: {
          ip: row.ip_address || row.ip || null,
          userAgent: row.user_agent || null,
        },

        session: {
          sessionId: row.session_id || null,
          refreshTokenHash: null,
        },

        source: {
          system: 'supabase',
          table: 'public.auth_logs',
          recordId: row.id || null,
        },

        metadata: {
          email: row.email || null,
          userIdentifier: row.identifier || null,
          outcome: row.outcome || row.status || (row.success === true ? 'success' : null),
        },
      });
    }
  }

  // ===== 2) Brute-force detection from public.brute_force_logs =====
  if (bruteError) {
    console.error('Error loading brute_force_logs:', bruteError);
  } else if (bruteLogs && bruteLogs.length > 0) {
    for (const row of bruteLogs) {
      events.push({
        ...SecurityEvent,

        id: `brute_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        type: SecurityEventType.BRUTE_FORCE_DETECTED,
        severity: 'HIGH',

        actor: {
          userId: row.user_id || null,
          email: row.email || null,
          role: null,
        },

        network: {
          ip: row.ip_address || row.ip || null,
          userAgent: null,
        },

        session: {
          sessionId: null,
          refreshTokenHash: null,
        },

        source: {
          system: 'supabase',
          table: 'public.brute_force_logs',
          recordId: row.id || null,
        },

        metadata: {
          failureCount: row.failure_count || null,
        },
      });
    }
  }

  // ===== 3) Session / token events from public.user_session =====
  if (sessionError) {
    console.error('Error loading user_session:', sessionError);
  } else if (sessions && sessions.length > 0) {
    for (const row of sessions) {
      const base = {
        ...SecurityEvent,

        occurredAt: row.created_at,
        severity: 'LOW',

        actor: {
          userId: row.user_id || null,
          email: null,
          role: null,
        },

        network: {
          ip: row.ip_address || null,
          userAgent: row.user_agent || null,
        },

        session: {
          sessionId: row.id ? String(row.id) : null,
          refreshTokenHash: row.refresh_token || null,
        },

        source: {
          system: 'supabase',
          table: 'public.user_session',
          recordId: row.id || null,
        },

        metadata: {
          refreshTokenExists: !!row.refresh_token,
          expiresAt: row.expires_at || null,
          revokedAt: row.revoked_at || null,
        },
      };

      events.push({
        ...base,
        id: `session_${row.id || row.created_at}`,
        type: SecurityEventType.SESSION_CREATED,
      });

      events.push({
        ...base,
        id: `token_${row.id || row.created_at}`,
        type: SecurityEventType.TOKEN_ISSUED,
      });

      if (row.revoked_at) {
        events.push({
          ...base,
          id: `session_revoked_${row.id || row.created_at}`,
          type: SecurityEventType.TOKEN_REVOKED,
          occurredAt: row.revoked_at,
          severity: 'MEDIUM',
        });
      }
    }
  }

  // ===== 4) Audit events from public.audit_logs =====
  if (auditError) {
    console.error('Error loading audit_logs:', auditError);
  } else if (auditLogs && auditLogs.length > 0) {
    for (const row of auditLogs) {
      events.push({
        ...SecurityEvent,
        id: `audit_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        type: inferAuditEventType(row),
        severity: 'LOW',

        actor: {
          userId: row.user_id || null,
          email: row.email || null,
          role: row.role || null,
        },

        network: {
          ip: row.ip_address || row.ip || null,
          userAgent: row.user_agent || null,
        },

        session: {
          sessionId: row.session_id || null,
          refreshTokenHash: null,
        },

        source: {
          system: 'supabase',
          table: 'public.audit_logs',
          recordId: row.id || null,
        },

        metadata: {
          eventType: row.event_type || row.action || null,
          outcome: row.outcome || row.status || null,
          details: row.details || null,
        },
      });
    }
  }

  // ===== 5) Application/system errors from public.error_logs =====
  if (errorLogError) {
    console.error('Error loading error_logs:', errorLogError);
  } else if (errorLogs && errorLogs.length > 0) {
    for (const row of errorLogs) {
      events.push({
        ...SecurityEvent,
        id: `error_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        type: SecurityEventType.ANOMALY_DETECTED,
        severity: 'HIGH',

        actor: {
          userId: row.user_id || null,
          email: row.email || null,
          role: null,
        },

        network: {
          ip: row.ip_address || row.ip || null,
          userAgent: row.user_agent || null,
        },

        session: {
          sessionId: row.session_id || null,
          refreshTokenHash: null,
        },

        source: {
          system: 'supabase',
          table: 'public.error_logs',
          recordId: row.id || null,
        },

        metadata: {
          errorType: row.error_type || null,
          errorMessage: row.error_message || row.message || null,
          endpoint: row.endpoint || null,
          method: row.method || null,
        },
      });
    }
  }

  // ===== 6) RBAC violations from public.rbac_violation_logs =====
  if (rbacError) {
    console.error('Error loading rbac_violation_logs:', rbacError);
  } else if (rbacViolationLogs && rbacViolationLogs.length > 0) {
    for (const row of rbacViolationLogs) {
      events.push({
        ...SecurityEvent,
        id: `rbac_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        type: SecurityEventType.ANOMALY_DETECTED,
        severity: 'HIGH',

        actor: {
          userId: row.user_id || null,
          email: row.email || null,
          role: row.role || null,
        },

        network: {
          ip: row.ip_address || row.ip || null,
          userAgent: row.user_agent || null,
        },

        session: {
          sessionId: row.session_id || null,
          refreshTokenHash: null,
        },

        source: {
          system: 'supabase',
          table: 'public.rbac_violation_logs',
          recordId: row.id || null,
        },

        metadata: {
          endpoint: row.endpoint || null,
          method: row.method || null,
          status: row.status || null,
        },
      });
    }
  }

  // ===== sort by occurredAt (do this ONCE) =====
  events.sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));

  return correlateSecurityEvents(events);
}

module.exports = {
  getSecurityEvents,
};
