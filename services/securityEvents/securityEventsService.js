const { SecurityEventType } = require('./securityEventTypes');
const supabase = require('../../dbConnection');  // Supabase client

async function getSecurityEvents(fromDate, toDate) {
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const events = [];

  // use Promise.all to get data in paraelle
  const [
    { data: authLogs, error: authError },
    { data: bruteLogs, error: bruteError },
    { data: sessions, error: sessionError },
  ] = await Promise.all([
    supabase
      .from('auth_logs')
      .select('*')
      .gte('created_at', fromIso)
      .lte('created_at', toIso),
    supabase
      .from('brute_force_logs')
      .select('*')
      .gte('created_at', fromIso)
      .lte('created_at', toIso),
    supabase
      .from('user_session')
      .select('*')
      .gte('created_at', fromIso)
      .lte('created_at', toIso),
  ]);

  // ===== 1) Login events from public.auth_logs =====
  if (authError) {
    console.error('Error loading auth_logs:', authError);
  } else if (authLogs && authLogs.length > 0) {
    for (const row of authLogs) {
      // try mutliple row to determine the success
      const isSuccess =
        row.success === true ||
        row.outcome === 'success' ||
        row.status === 'success';

      events.push({
        id: `auth_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        type: isSuccess
          ? SecurityEventType.LOGIN_SUCCESS
          : SecurityEventType.LOGIN_FAILURE,
        userId: row.user_id || null,
        sessionId: row.session_id || null,
        ipAddress: row.ip_address || row.ip || null,
        userAgent: row.user_agent || null,
        source: 'public.auth_logs',
        metadata: {
          email: row.email || null,
          userIdentifier: row.identifier || null,
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
        id: `brute_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        type: SecurityEventType.BRUTE_FORCE_DETECTED,
        userId: row.user_id || null,
        sessionId: null,
        ipAddress: row.ip_address || row.ip || null,
        userAgent: null,
        source: 'public.brute_force_logs',
        metadata: {
          email: row.email || null,
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
        id: `session_${row.id || row.created_at}`,
        occurredAt: row.created_at,
        userId: row.user_id || null,
        sessionId: row.id ? String(row.id) : null,
        ipAddress: row.ip_address || null,
        userAgent: row.user_agent || null,
        source: 'public.user_session',
        metadata: {
          refreshTokenExists: !!row.refresh_token,
          expiresAt: row.expires_at || null,
          revokedAt: row.revoked_at || null,
        },
      };

      // Session created
      events.push({
        ...base,
        type: SecurityEventType.SESSION_CREATED,
      });

      // Token issued
      events.push({
        ...base,
        type: SecurityEventType.TOKEN_ISSUED,
      });

      // Token revoked（If there is revoked_at）
      if (row.revoked_at) {
        events.push({
          ...base,
          id: `session_revoked_${row.id || row.created_at}`,
          type: SecurityEventType.TOKEN_REVOKED,
          occurredAt: row.revoked_at,
        });
      }
    }
  }

  // ===== sort by occurred At =====
  events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  return events;
}

module.exports = {
  getSecurityEvents,
};
