const { SecurityEventType } = require('./securityEventTypes');
const { SecurityEvent } = require('./securityEventModel');
const { aggregateIncidents } = require('./securityIncidentAggregator');

const supabase = require('../../dbConnection'); // Supabase client

function correlateSecurityEvents(events) {
  const incidents = aggregateIncidents(events) || [];
  return { events, incidents };
}

async function getSecurityEvents(fromDate, toDate) {
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const events = [];

  const [
    { data: authLogs, error: authError },
    { data: bruteLogs, error: bruteError },
    { data: sessions, error: sessionError },
  ] = await Promise.all([
    supabase.from('auth_logs').select('*').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('brute_force_logs').select('*').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('user_session').select('*').gte('created_at', fromIso).lte('created_at', toIso),
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

  // ===== sort by occurredAt (do this ONCE) =====
  events.sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));

  return correlateSecurityEvents(events);
}

module.exports = {
  getSecurityEvents,
};
