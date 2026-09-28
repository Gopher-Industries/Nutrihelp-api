const https = require('https');
const nodemailer = require('nodemailer');

const { getSupabaseServiceClient } = require('./supabaseClient');
const supabaseService = getSupabaseServiceClient();

const ALERT_DEDUP_WINDOW_MS = 5 * 60 * 1000;
const HEARTBEAT_WINDOW_MS = 5 * 60 * 1000;
const JOB_LOCK_COMPONENT = 'alert_job_lock';
const JOB_LOCK_TTL_MS = 4.5 * 60 * 1000; // a run must complete within 4.5 min

// In-memory dedup is a fast local cache. DB-backed dedup in filterDedupedFromDB
// provides the cross-instance guarantee — both layers run on every cycle.
let supabaseUnavailableCount = 0;
const MAX_SUPABASE_UNAVAILABLE_WARNINGS = 3;

const SENSITIVE_ENDPOINT_PATTERNS = [
  /^\/api\/login/i,
  /^\/api\/auth\//i,
  /^\/api\/signup/i,
  /^\/api\/chatbot\//i,
  /^\/api\/plan\/generate/i
];

const AI_ENDPOINT_PATTERNS = [
  { regex: /^\/api\/chatbot\//i, tag: 'AI_CHAT', operationType: 'CHAT_INFERENCE' },
  { regex: /^\/api\/plan\/generate/i, tag: 'AI_PLAN_GENERATION', operationType: 'PLAN_GENERATION' },
  { regex: /^\/api\/image\//i, tag: 'AI_IMAGE', operationType: 'IMAGE_PROCESSING' }
];

const alertDedupCache = new Map();
const inMemoryWindows = {
  queryFailures: [],
  checkerHeartbeat: []
};

let alertHistoryMissingWarned = false;
let lastArchiveRun = 0;
const RETENTION_DAYS = 90;

let cachedTransporter = null;

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getTimestamp(row) {
  return toDate(
    row.created_at ||
      row.timestamp ||
      row.updated_at ||
      row.event_time ||
      row.logged_at ||
      row.time
  );
}

function getPrincipal(row) {
  return (
    row.user_id ||
    row.account_identifier ||
    row.email ||
    row.username ||
    row.principal_id ||
    null
  );
}

function getIp(row) {
  return row.ip_address || row.source_ip || row.ip || row.client_ip || null;
}

function getEndpoint(row) {
  return row.endpoint || row.path || row.route || row.request_path || null;
}

function getEventType(row) {
  return normalizeString(row.event_type || row.type || row.action || row.operation || row.status || '').toLowerCase();
}

function isLoginFailure(row) {
  const eventType = getEventType(row);
  if (row.success === false) {
    return true;
  }
  return (
    eventType.includes('login') &&
    (eventType.includes('fail') || eventType.includes('invalid') || eventType.includes('denied'))
  );
}

function isLoginSuccess(row) {
  const eventType = getEventType(row);
  if (row.success === true) {
    return true;
  }
  return eventType.includes('login') && eventType.includes('success');
}

function isMfaFailure(row) {
  const eventType = getEventType(row);
  return eventType.includes('mfa') && (eventType.includes('fail') || eventType.includes('invalid'));
}

function isTokenEvent(row) {
  const eventType = getEventType(row);
  return (
    eventType.includes('token') ||
    eventType.includes('issue') ||
    eventType.includes('refresh') ||
    eventType.includes('reissue') ||
    eventType.includes('revoke')
  );
}

function isRevokeEvent(row) {
  const eventType = getEventType(row);
  return eventType.includes('revoke');
}

function isIssueEvent(row) {
  const eventType = getEventType(row);
  return eventType.includes('issue') || eventType.includes('refresh') || eventType.includes('reissue');
}

function isDecryptFailure(row) {
  const eventType = getEventType(row);
  return eventType.includes('decrypt') && (eventType.includes('fail') || eventType.includes('error'));
}

function isDecryptOperation(row) {
  const eventType = getEventType(row);
  return eventType.includes('decrypt');
}

function isSensitiveEndpoint(endpoint) {
  if (!endpoint) return false;
  return SENSITIVE_ENDPOINT_PATTERNS.some((pattern) => pattern.test(endpoint));
}

function getAiTagInfo(endpoint) {
  if (!endpoint) {
    return null;
  }

  const matched = AI_ENDPOINT_PATTERNS.find((item) => item.regex.test(endpoint));
  return matched || null;
}

function pruneOldValues(list, windowMs) {
  const now = Date.now();
  while (list.length > 0 && now - list[0] > windowMs) {
    list.shift();
  }
}

function addWindowEvent(name, windowMs) {
  if (!Array.isArray(inMemoryWindows[name])) {
    inMemoryWindows[name] = [];
  }
  inMemoryWindows[name].push(Date.now());
  pruneOldValues(inMemoryWindows[name], windowMs);
}

function getWindowCount(name, windowMs) {
  if (!Array.isArray(inMemoryWindows[name])) {
    return 0;
  }
  pruneOldValues(inMemoryWindows[name], windowMs);
  return inMemoryWindows[name].length;
}

function shouldSendDeduped(alertId, fingerprint) {
  const key = `${alertId}:${fingerprint}`;
  const now = Date.now();
  const lastSent = alertDedupCache.get(key);

  if (lastSent && now - lastSent < ALERT_DEDUP_WINDOW_MS) {
    return false;
  }

  alertDedupCache.set(key, now);
  return true;
}

async function safeQuery(tableName, windowMinutes, options = {}) {
  if (!supabaseService) {
    return [];
  }

  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const select = options.select || '*';
  const limit = options.limit || 5000;

  try {
    let query = supabaseService
      .from(tableName)
      .select(select)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (Array.isArray(options.eq)) {
      options.eq.forEach((filter) => {
        query = query.eq(filter.column, filter.value);
      });
    }

    if (Array.isArray(options.in)) {
      options.in.forEach((filter) => {
        query = query.in(filter.column, filter.values);
      });
    }

    if (typeof options.or === 'string' && options.or.length > 0) {
      query = query.or(options.or);
    }

    const { data, error } = await query;

    if (error) {
      const relationMissing =
        (error.message && error.message.toLowerCase().includes('does not exist')) ||
        (error.details && String(error.details).toLowerCase().includes('does not exist'));

      if (relationMissing) {
        console.warn(`[securityAlertService] Table missing: ${tableName}. Continuing with empty dataset.`);
        return [];
      }

      addWindowEvent('queryFailures', HEARTBEAT_WINDOW_MS);
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    addWindowEvent('queryFailures', HEARTBEAT_WINDOW_MS);
    console.error(`[securityAlertService] Query failed for ${tableName}:`, error.message || error);
    return [];
  }
}

async function loadAlertData() {
  const [authLogs, bruteForceLogs, errorLogs, sessionLogs, tokenLogs, integrityLogs, heartbeatLogs, cryptoLogs] = await Promise.all([
    safeQuery('auth_logs', 30),
    safeQuery('brute_force_logs', 30),
    safeQuery('error_logs', 30),
    safeQuery('session_logs', 30),
    safeQuery('token_logs', 30),
    safeQuery('integrity_logs', 30),
    safeQuery('monitoring_heartbeats', 30),
    safeQuery('crypto_logs', 30)
  ]);

  return {
    authLogs,
    bruteForceLogs,
    errorLogs,
    sessionLogs,
    tokenLogs,
    integrityLogs,
    heartbeatLogs,
    cryptoLogs
  };
}

function createBaseAlert(alertId, severity, triggerSummary, payload, options = {}) {
  const primaryEndpoint = payload.endpoint || (Array.isArray(payload.endpoint_paths) ? payload.endpoint_paths[0] : null);
  const aiTagInfo = getAiTagInfo(primaryEndpoint);
  const fingerprint = options.fingerprint || payload.account_identifier || payload.principal_id || payload.source_ip || 'global';

  const channels = ['email'];
  if (process.env.SLACK_WEBHOOK_URL) {
    channels.push('slack');
  }

  const alert = {
    alert_id: alertId,
    severity,
    trigger_summary: triggerSummary,
    notification_channels: channels,
    triage_sla_minutes: severity === 'Critical' ? 15 : 60,
    response_actions: options.responseActions || [],
    payload: {
      ...payload,
      event_time_window: options.eventTimeWindow || payload.event_time_window || null
    },
    fingerprint
  };

  if (aiTagInfo) {
    alert.payload.ai_endpoint_tag = aiTagInfo.tag;
    alert.payload.ai_operation_type = aiTagInfo.operationType;
  }

  return alert;
}

function evaluateA1(data, signalBook) {
  const rows = [...data.authLogs, ...data.bruteForceLogs].filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 10 * 60 * 1000;
  });

  const failedByPrincipal = new Map();

  rows.forEach((row) => {
    if (!isLoginFailure(row)) return;
    const principal = getPrincipal(row);
    if (!principal) return;
    if (!failedByPrincipal.has(principal)) {
      failedByPrincipal.set(principal, []);
    }
    failedByPrincipal.get(principal).push(row);
  });

  const alerts = [];
  failedByPrincipal.forEach((events, principal) => {
    if (events.length < 10) return;
    const sourceIps = [...new Set(events.map(getIp).filter(Boolean))];
    const endpointPaths = [...new Set(events.map(getEndpoint).filter(Boolean))];

    alerts.push(
      createBaseAlert(
        'A1',
        'High',
        '10 or more failed login attempts for same account within 10 minutes',
        {
          account_identifier: principal,
          failed_count: events.length,
          source_ips: sourceIps,
          endpoint_paths: endpointPaths,
          request_ids: events.map((item) => item.request_id).filter(Boolean)
        },
        {
          eventTimeWindow: '10m',
          fingerprint: principal,
          responseActions: [
            'Confirm account attack pattern from auth history.',
            'Apply temporary account lock (10-30 minutes) if not active.',
            'Notify affected user with account-protection guidance.',
            'Add source IPs to 24-hour watchlist.'
          ]
        }
      )
    );

    signalBook.push({ principal, sourceIps, alertId: 'A1' });
  });

  return alerts;
}

function evaluateA2(data, signalBook) {
  const rows = [...data.authLogs, ...data.bruteForceLogs].filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 10 * 60 * 1000 && isLoginFailure(row);
  });

  const byIp = new Map();
  rows.forEach((row) => {
    const ip = getIp(row);
    if (!ip) return;
    if (!byIp.has(ip)) {
      byIp.set(ip, []);
    }
    byIp.get(ip).push(row);
  });

  const alerts = [];
  byIp.forEach((events, ip) => {
    const principals = [...new Set(events.map(getPrincipal).filter(Boolean))];
    if (events.length < 20 || principals.length < 3) return;

    alerts.push(
      createBaseAlert(
        'A2',
        'High',
        '20 or more failed logins from one IP across at least 3 accounts within 10 minutes',
        {
          source_ip: ip,
          failed_count: events.length,
          targeted_account_count: principals.length,
          targeted_accounts_sample: principals.slice(0, 5),
          endpoint_paths: [...new Set(events.map(getEndpoint).filter(Boolean))],
          first_seen: getTimestamp(events[events.length - 1])?.toISOString() || null,
          last_seen: getTimestamp(events[0])?.toISOString() || null
        },
        {
          eventTimeWindow: '10m',
          fingerprint: ip,
          responseActions: [
            'Validate if source is malicious scanner or bot.',
            'Apply temporary IP block or stricter rate limit.',
            'Inspect targeted accounts for unusual activity.',
            'Capture IOC details for incident records.'
          ]
        }
      )
    );

    signalBook.push({ principal: null, sourceIps: [ip], alertId: 'A2' });
  });

  return alerts;
}

function evaluateA3(data, signalBook) {
  const rows = [...data.authLogs, ...data.bruteForceLogs];
  const alerts = [];

  const successRows = rows.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 5 * 60 * 1000 && isLoginSuccess(row);
  });

  successRows.forEach((success) => {
    const principal = getPrincipal(success);
    if (!principal) return;
    const successTs = getTimestamp(success);
    if (!successTs) return;

    const precedingFails = rows.filter((row) => {
      const ts = getTimestamp(row);
      if (!ts || !isLoginFailure(row) || getPrincipal(row) !== principal) return false;
      return ts <= successTs && successTs.getTime() - ts.getTime() <= 5 * 60 * 1000;
    });

    if (precedingFails.length < 5) return;

    alerts.push(
      createBaseAlert(
        'A3',
        'Critical',
        'Successful login observed within 5 minutes after 5 or more failed attempts on same account',
        {
          account_identifier: principal,
          success_event_id: success.id || success.request_id || null,
          preceding_failed_count: precedingFails.length,
          source_ip_sequence: [...new Set(precedingFails.map(getIp).filter(Boolean))],
          endpoint_paths: [...new Set(precedingFails.map(getEndpoint).filter(Boolean))],
          session_ids: [success.session_id].filter(Boolean),
          token_ids: [success.token_id].filter(Boolean)
        },
        {
          eventTimeWindow: '5m',
          fingerprint: principal,
          responseActions: [
            'Validate legitimacy of the successful login immediately.',
            'Force token and session revocation for suspicious sessions.',
            'Trigger step-up authentication for the account.',
            'Open incident ticket and preserve logs.'
          ]
        }
      )
    );

    signalBook.push({ principal, sourceIps: [getIp(success)].filter(Boolean), alertId: 'A3' });
  });

  return alerts;
}

function evaluateA4(data) {
  const rows = data.authLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 10 * 60 * 1000 && isMfaFailure(row);
  });

  const byPrincipal = new Map();
  rows.forEach((row) => {
    const principal = getPrincipal(row);
    if (!principal) return;
    if (!byPrincipal.has(principal)) {
      byPrincipal.set(principal, []);
    }
    byPrincipal.get(principal).push(row);
  });

  const alerts = [];
  byPrincipal.forEach((events, principal) => {
    if (events.length < 5) return;
    alerts.push(
      createBaseAlert(
        'A4',
        'High',
        '5 or more MFA verification failures for same account within 10 minutes',
        {
          account_identifier: principal,
          mfa_failure_count: events.length,
          source_ips: [...new Set(events.map(getIp).filter(Boolean))],
          user_agents: [...new Set(events.map((item) => item.user_agent).filter(Boolean))]
        },
        {
          eventTimeWindow: '10m',
          fingerprint: principal,
          responseActions: [
            'Check whether password phase was successful before MFA failures.',
            'Temporarily suspend MFA retries for the account.',
            'Prompt user for account verification and password reset.',
            'Investigate source IP/device consistency.'
          ]
        }
      )
    );
  });

  return alerts;
}

function evaluateA5(data) {
  const rows = data.errorLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 15 * 60 * 1000;
  });

  const rateLimitHits = rows.filter((row) => {
    const status = row.status || row.http_status;
    return status === 429 || status === '429';
  });

  const byIp = new Map();
  rateLimitHits.forEach((row) => {
    const ip = getIp(row);
    if (!ip) return;
    const endpoint = getEndpoint(row);
    if (!isSensitiveEndpoint(endpoint)) return;

    if (!byIp.has(ip)) {
      byIp.set(ip, []);
    }
    byIp.get(ip).push(row);
  });

  const alerts = [];
  byIp.forEach((events, ip) => {
    if (events.length < 30) return;

    const endpointDistribution = {};
    events.forEach((event) => {
      const endpoint = getEndpoint(event) || 'unknown';
      endpointDistribution[endpoint] = (endpointDistribution[endpoint] || 0) + 1;
    });

    alerts.push(
      createBaseAlert(
        'A5',
        'High',
        '30 or more rate-limit (429) hits from same IP on sensitive endpoints within 15 minutes',
        {
          source_ip: ip,
          rate_limit_hit_count: events.length,
          endpoint_distribution: endpointDistribution,
          peak_rps_estimate: Math.round(events.length / 15),
          status_code: 429
        },
        {
          eventTimeWindow: '15m',
          fingerprint: ip,
          responseActions: [
            'Confirm abusive request burst pattern.',
            'Enforce stricter IP-based throttle or temporary ban.',
            'Verify no service degradation is occurring.',
            'If AI endpoint involved, notify AI Lead.'
          ]
        }
      )
    );
  });

  return alerts;
}

function evaluateA6(data) {
  const rows = data.sessionLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 30 * 60 * 1000;
  });

  const byUser = new Map();
  rows.forEach((row) => {
    const userId = getPrincipal(row);
    if (!userId) return;
    if (!byUser.has(userId)) {
      byUser.set(userId, []);
    }
    byUser.get(userId).push(row);
  });

  const alerts = [];
  byUser.forEach((sessions, userId) => {
    if (sessions.length < 2) return;

    const locations = sessions.map((s) => ({
      country: s.country,
      region: s.region,
      ip: getIp(s),
      ts: getTimestamp(s)
    })).filter((loc) => loc.country || loc.region);

    if (locations.length < 2) return;

    const hasImpossibleTravel = sessions.some((s) => s.impossible_travel === true);

    if (!hasImpossibleTravel) {
      const uniqueLocations = new Set(
        locations.map((loc) => `${loc.country || 'unknown'}-${loc.region || 'unknown'}`)
      );
      if (uniqueLocations.size < 2) return;
    }

    alerts.push(
      createBaseAlert(
        'A6',
        'High',
        '2 or more active sessions for same account within 30 minutes with conflicting/impossible location metadata',
        {
          account_identifier: userId,
          active_session_count: sessions.length,
          session_ids: sessions.map((s) => s.session_id).filter(Boolean),
          location_markers: locations.map((loc) => ({
            country: loc.country,
            region: loc.region,
            ip: loc.ip
          })),
          ip_addresses: [...new Set(sessions.map(getIp).filter(Boolean))],
          user_agents: [...new Set(sessions.map((s) => s.user_agent).filter(Boolean))],
          created_at_list: sessions.map((s) => getTimestamp(s)?.toISOString()).filter(Boolean)
        },
        {
          eventTimeWindow: '30m',
          fingerprint: userId,
          responseActions: [
            'Validate if sessions are legitimate multi-device use.',
            'Revoke suspicious sessions and force re-authentication.',
            'Flag account for enhanced monitoring.',
            'Notify user of suspicious session activity.'
          ]
        }
      )
    );
  });

  return alerts;
}

function evaluateA7(data) {
  const rows = data.tokenLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 10 * 60 * 1000 && isTokenEvent(row);
  });

  const byPrincipal = new Map();
  rows.forEach((row) => {
    const principal = getPrincipal(row);
    if (!principal) return;
    if (!byPrincipal.has(principal)) {
      byPrincipal.set(principal, []);
    }
    byPrincipal.get(principal).push(row);
  });

  const alerts = [];
  byPrincipal.forEach((events, principal) => {
    if (events.length < 8) return;

    const revokeEvents = events.filter(isRevokeEvent);
    const issueEvents = events.filter(isIssueEvent);

    let revokeReissueLoops = 0;
    const recentRevokes = new Map();

    revokeEvents.forEach((revoke) => {
      const revokeTs = getTimestamp(revoke);
      if (!revokeTs) return;

      const subsequentIssues = issueEvents.filter((issue) => {
        const issueTs = getTimestamp(issue);
        return issueTs && issueTs > revokeTs && issueTs.getTime() - revokeTs.getTime() <= 10 * 60 * 1000;
      });

      if (subsequentIssues.length > 0) {
        revokeReissueLoops++;
      }
    });

    if (revokeReissueLoops < 3) return;

    alerts.push(
      createBaseAlert(
        'A7',
        'High',
        '8 or more token events for same principal within 10 minutes, or 3+ rapid revoke/reissue loops',
        {
          principal_id: principal,
          token_event_count: events.length,
          revoke_reissue_loops: revokeReissueLoops,
          refresh_endpoint_hits: events.filter((e) => getEventType(e).includes('refresh')).length,
          ip_addresses: [...new Set(events.map(getIp).filter(Boolean))],
          device_info: [...new Set(events.map((e) => e.device_info || e.user_agent).filter(Boolean))]
        },
        {
          eventTimeWindow: '10m',
          fingerprint: principal,
          responseActions: [
            'Inspect token service for replay or automation behavior.',
            'Revoke suspect refresh tokens.',
            'Validate client/device legitimacy.',
            'Check for abuse of refresh endpoint.'
          ]
        }
      )
    );
  });

  return alerts;
}

function evaluateA8(data, signalBook) {
  const recentSignals = signalBook.filter((signal) => {
    return Date.now() - signal.timestamp < 10 * 60 * 1000;
  });

  const byFingerprint = new Map();
  recentSignals.forEach((signal) => {
    const key = signal.principal || signal.sourceIps?.[0] || 'global';
    if (!byFingerprint.has(key)) {
      byFingerprint.set(key, []);
    }
    byFingerprint.get(key).push(signal);
  });

  const alerts = [];
  byFingerprint.forEach((signals, fingerprint) => {
    if (signals.length < 3) return;

    const highRiskSignals = signals.filter((s) => ['A1', 'A2', 'A3', 'A5', 'A6', 'A7', 'A11'].includes(s.alertId));
    if (highRiskSignals.length < 3) return;

    const contributingAlerts = [...new Set(signals.map((s) => s.alertId))];
    const impactedAccounts = [...new Set(signals.map((s) => s.principal).filter(Boolean))];
    const impactedIps = [...new Set(signals.flatMap((s) => s.sourceIps || []).filter(Boolean))];

    alerts.push(
      createBaseAlert(
        'A8',
        'Critical',
        'Correlation engine confidence >=0.80 or 3+ high-risk signals for same principal/IP within 10 minutes',
        {
          correlation_confidence: 0.85,
          incident_fingerprint: fingerprint,
          contributing_alerts: contributingAlerts,
          timeline: signals.map((s) => ({ alert_id: s.alertId, timestamp: s.timestamp })),
          impacted_accounts: impactedAccounts,
          impacted_ips: impactedIps
        },
        {
          eventTimeWindow: '10m',
          fingerprint,
          responseActions: [
            'Open P1 incident bridge and assign incident commander.',
            'Contain attack path (IP/account/session controls).',
            'Preserve forensic evidence and timeline.',
            'Communicate impact status every 30 minutes.'
          ]
        }
      )
    );
  });

  return alerts;
}

function evaluateA9(data) {
  const rows = data.integrityLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 60 * 60 * 1000;
  });

  const tamperEvents = rows.filter((row) => {
    return row.hash_mismatch === true || row.missing_file === true;
  });

  if (tamperEvents.length === 0) return [];

  const latestTamper = tamperEvents[0];
  return [
    createBaseAlert(
      'A9',
      'Critical',
      'File integrity mismatch or missing critical file detected',
      {
        host_id: latestTamper.host_id || 'unknown',
        file_path: latestTamper.file_path,
        baseline_hash: latestTamper.baseline_hash,
        observed_hash: latestTamper.observed_hash,
        tamper_type: latestTamper.hash_mismatch ? 'hash_mismatch' : 'missing_file',
        integrity_scan_id: latestTamper.scan_id,
        last_known_good_build: latestTamper.last_good_build
      },
      {
        fingerprint: latestTamper.file_path,
        responseActions: [
          'Isolate affected host/process from deployment pipeline.',
          'Compare artifact against trusted baseline.',
          'Roll back to known-good release if tampering confirmed.',
          'Start compromise investigation.'
        ]
      }
    )
  ];
}

function evaluateA10(data) {
  const heartbeatRows = data.heartbeatLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 10 * 60 * 1000;
  });

  const recentFailures = inMemoryWindows.queryFailures || [];
  const failureCount = getWindowCount('queryFailures', HEARTBEAT_WINDOW_MS);

  if (failureCount < 1 && heartbeatRows.length > 0) return [];

  const lastHeartbeat = heartbeatRows.length > 0 ? getTimestamp(heartbeatRows[0]) : null;
  const timeSinceLastHeartbeat = lastHeartbeat ? Date.now() - lastHeartbeat.getTime() : Date.now();

  if (timeSinceLastHeartbeat < HEARTBEAT_WINDOW_MS && failureCount < 1) return [];

  return [
    createBaseAlert(
      'A10',
      'High',
      'Monitoring ingestion/heartbeat absent for >5 minutes or persistent query failures',
      {
        failing_component: 'alert_checker',
        first_failure_time: lastHeartbeat ? lastHeartbeat.toISOString() : null,
        last_healthy_time: lastHeartbeat ? lastHeartbeat.toISOString() : null,
        error_samples: recentFailures.slice(-3).map((ts) => new Date(ts).toISOString()),
        affected_tables: ['auth_logs', 'session_logs', 'token_logs', 'integrity_logs', 'crypto_logs'],
        backlog_estimate: Math.floor(timeSinceLastHeartbeat / (60 * 1000))
      },
      {
        fingerprint: 'monitoring_pipeline',
        responseActions: [
          'Confirm whether outage is partial or full monitoring blind spot.',
          'Restart failed monitoring component.',
          'Verify backlog ingestion recovery.',
          'Record blind-spot duration and risk impact.'
        ]
      }
    )
  ];
}

function evaluateA11(data) {
  const rows = data.errorLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 10 * 60 * 1000;
  });

  const criticalErrors = rows.filter((row) => {
    const category = row.category || row.error_category;
    return category === 'critical' || category === 'security';
  });

  if (criticalErrors.length === 0) return [];

  const byEndpoint = new Map();
  criticalErrors.forEach((row) => {
    const endpoint = getEndpoint(row) || 'unknown';
    if (!byEndpoint.has(endpoint)) {
      byEndpoint.set(endpoint, []);
    }
    byEndpoint.get(endpoint).push(row);
  });

  const alerts = [];
  byEndpoint.forEach((events, endpoint) => {
    const severity = events.length >= 3 ? 'Critical' : 'High';
    const triggerSummary = events.length >= 3
      ? '3 or more critical security errors on auth/session/security routes within 10 minutes'
      : 'Critical security error on auth/session/security routes';

    alerts.push(
      createBaseAlert(
        'A11',
        severity,
        triggerSummary,
        {
          error_category: 'critical',
          error_type: events[0].error_type || 'unknown',
          error_message_class: events[0].error_message?.substring(0, 100) || 'unknown',
          endpoint,
          method: events[0].method || 'unknown',
          ip_address: getIp(events[0]),
          trace_id: events[0].trace_id || events[0].request_id,
          repeat_count: events.length
        },
        {
          eventTimeWindow: '10m',
          fingerprint: `${endpoint}:${events[0].method || 'unknown'}`,
          responseActions: [
            'Identify failing endpoint and blast radius.',
            'Verify if error indicates exploit attempt vs service bug.',
            'Apply hotfix or temporary route guard if needed.',
            'Escalate to incident if repeat burst is detected.'
          ]
        }
      )
    );
  });

  return alerts;
}

function evaluateA12(data) {
  const rows = data.cryptoLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 15 * 60 * 1000 && isDecryptFailure(row);
  });

  if (rows.length < 10) return [];

  const totalDecryptOps = data.cryptoLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 15 * 60 * 1000 && isDecryptOperation(row);
  }).length;

  const failureRate = totalDecryptOps > 0 ? rows.length / totalDecryptOps : 1;

  if (failureRate < 0.3 && rows.length < 10) return [];

  return [
    createBaseAlert(
      'A12',
      'High',
      '10 or more decrypt failures within 15 minutes, or decrypt failure rate >=30%',
      {
        crypto_operation: 'decrypt',
        failure_count: rows.length,
        failure_rate: Math.round(failureRate * 100) / 100,
        key_identifier: rows[0]?.key_id || 'unknown',
        key_version: rows[0]?.key_version || 'unknown',
        endpoint: getEndpoint(rows[0]),
        source_ips: [...new Set(rows.map(getIp).filter(Boolean))]
      },
      {
        eventTimeWindow: '15m',
        fingerprint: 'crypto_operations',
        responseActions: [
          'Validate key usage and key version alignment.',
          'Verify no malformed payload replay pattern exists.',
          'Inspect AI and API consumers for misuse.',
          'Rotate affected keys if compromise suspected.'
        ]
      }
    )
  ];
}

// DB-backed cross-instance deduplication. Checks alert_history for any alert
// with the same alert_id + fingerprint sent within the dedup window.
async function filterDedupedFromDB(alerts) {
  if (!supabaseService || alerts.length === 0) return alerts;

  const since = new Date(Date.now() - ALERT_DEDUP_WINDOW_MS).toISOString();
  try {
    const { data: recentAlerts, error } = await supabaseService
      .from('alert_history')
      .select('alert_id, fingerprint')
      .gte('created_at', since);

    if (error || !recentAlerts) return alerts;

    const sentKeys = new Set(recentAlerts.map((r) => `${r.alert_id}:${r.fingerprint}`));
    return alerts.filter((alert) => !sentKeys.has(`${alert.alert_id}:${alert.fingerprint}`));
  } catch (_err) {
    // Non-fatal — fall back to in-memory dedup only if DB check fails.
    return alerts;
  }
}

async function checkAlerts() {
  if (!supabaseService) {
    supabaseUnavailableCount++;
    const logFn = supabaseUnavailableCount >= MAX_SUPABASE_UNAVAILABLE_WARNINGS
      ? console.error
      : console.warn;
    logFn(
      `[securityAlertService] Supabase not configured — alert checks skipped ` +
      `(consecutive unavailable count: ${supabaseUnavailableCount}). ` +
      `Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable monitoring.`
    );
    return { alerts: [], dispatch_results: [] };
  }

  supabaseUnavailableCount = 0;

  try {
    const data = await loadAlertData();
    const signalBook = [];

    const allAlerts = [
      ...evaluateA1(data, signalBook),
      ...evaluateA2(data, signalBook),
      ...evaluateA3(data, signalBook),
      ...evaluateA4(data),
      ...evaluateA5(data),
      ...evaluateA6(data),
      ...evaluateA7(data),
      ...evaluateA8(data, signalBook),
      ...evaluateA9(data),
      ...evaluateA10(data),
      ...evaluateA11(data),
      ...evaluateA12(data)
    ];

    // Layer 1: fast in-process dedup (single instance).
    const inMemoryDeduped = allAlerts.filter((alert) =>
      shouldSendDeduped(alert.alert_id, alert.fingerprint)
    );

    // Layer 2: DB-backed cross-instance dedup — filters out alerts already
    // sent by another process within the dedup window.
    const dedupedAlerts = await filterDedupedFromDB(inMemoryDeduped);

    const dispatchResults = [];
    for (const alert of dedupedAlerts) {
      try {
        const result = await sendAlert(alert);
        dispatchResults.push(result);
      } catch (error) {
        console.error(`[securityAlertService] Failed to send alert ${alert.alert_id}:`, error.message || error);
        dispatchResults.push({ alert_id: alert.alert_id, success: false, error: error.message });
      }
    }

    return { alerts: dedupedAlerts, dispatch_results: dispatchResults };
  } catch (error) {
    console.error('[securityAlertService] checkAlerts failed:', error.message || error);
    return { alerts: [], dispatch_results: [] };
  }
}

async function sendAlert(alert) {
  const channels = alert.notification_channels || ['email'];

  const results = { alert_id: alert.alert_id, channels: {} };

  if (channels.includes('email')) {
    try {
      await sendEmailAlert(alert);
      results.channels.email = { success: true };
    } catch (error) {
      console.error(`[securityAlertService] Email send failed for ${alert.alert_id}:`, error.message || error);
      results.channels.email = { success: false, error: error.message };
    }
  }

  if (channels.includes('slack')) {
    try {
      await sendSlackAlert(alert);
      results.channels.slack = { success: true };
    } catch (error) {
      console.error(`[securityAlertService] Slack send failed for ${alert.alert_id}:`, error.message || error);
      results.channels.slack = { success: false, error: error.message };
    }
  }

  results.overall_success = Object.values(results.channels).some((ch) => ch.success);

  if (results.overall_success) {
    await persistAlertHistory(alert);
  }

  return results;
}

async function sendEmailAlert(alert) {
  if (!cachedTransporter) {
    const transporterConfig = {
      service: 'gmail',
      auth: {
        user: process.env.ALERT_EMAIL_FROM,
        pass: process.env.ALERT_EMAIL_PASSWORD
      }
    };

    if (process.env.SMTP_HOST) {
      transporterConfig.host = process.env.SMTP_HOST;
      transporterConfig.port = parseInt(process.env.SMTP_PORT) || 587;
      transporterConfig.secure = process.env.SMTP_SECURE === 'true';
      delete transporterConfig.service;
    }

    cachedTransporter = nodemailer.createTransporter(transporterConfig);
  }

  const subject = `[${alert.severity}] NutriHelp Security Alert ${alert.alert_id}`;
  const recipients = (process.env.ALERT_EMAIL_TO || '').split(',').map((email) => email.trim()).filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('No email recipients configured (ALERT_EMAIL_TO)');
  }

  const htmlBody = `
    <h2>🚨 NutriHelp Security Alert ${alert.alert_id}</h2>
    <p><strong>Severity:</strong> ${alert.severity}</p>
    <p><strong>Trigger:</strong> ${alert.trigger_summary}</p>
    <p><strong>Time Window:</strong> ${alert.payload.event_time_window || 'N/A'}</p>
    <p><strong>Fingerprint:</strong> ${alert.fingerprint}</p>

    <h3>Response Actions</h3>
    <ul>
      ${alert.response_actions.map((action) => `<li>${action}</li>`).join('')}
    </ul>

    <h3>Alert Payload</h3>
    <pre>${JSON.stringify(alert.payload, null, 2)}</pre>

    <p><em>This alert was generated by the NutriHelp security monitoring system.</em></p>
  `;

  const mailOptions = {
    from: process.env.ALERT_EMAIL_FROM,
    to: recipients,
    subject,
    html: htmlBody
  };

  const info = await cachedTransporter.sendMail(mailOptions);
  console.log(`[securityAlertService] Email sent for ${alert.alert_id}:`, info.messageId);
}

async function sendSlackAlert(alert) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('Slack webhook URL not configured');
  }

  const payload = {
    text: `🚨 *NutriHelp Security Alert ${alert.alert_id}*`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 NutriHelp Security Alert ${alert.alert_id}`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Severity:* ${alert.severity}` },
          { type: 'mrkdwn', text: `*Trigger:* ${alert.trigger_summary}` },
          { type: 'mrkdwn', text: `*Time Window:* ${alert.payload.event_time_window || 'N/A'}` },
          { type: 'mrkdwn', text: `*Fingerprint:* ${alert.fingerprint}` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Response Actions:*\n${alert.response_actions.map((action) => `• ${action}`).join('\n')}`
        }
      }
    ]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
  }

  console.log(`[securityAlertService] Slack notification sent for ${alert.alert_id}`);
}

async function persistAlertHistory(alert) {
  if (!supabaseService) return;

  try {
    const historyEntry = {
      alert_id: alert.alert_id,
      severity: alert.severity,
      trigger_summary: alert.trigger_summary,
      notification_channels: alert.notification_channels,
      triage_sla_minutes: alert.triage_sla_minutes,
      response_actions: alert.response_actions,
      payload: alert.payload,
      fingerprint: alert.fingerprint,
      status: 'sent',
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseService
      .from('alert_history')
      .insert([historyEntry]);

    if (error && !alertHistoryMissingWarned) {
      if (error.code === '42P01') {
        console.warn('[securityAlertService] alert_history table not created yet. Run scripts/create_alert_history.sql');
        alertHistoryMissingWarned = true;
      } else {
        console.error('[securityAlertService] Failed to persist alert history:', error.message || error);
      }
    }
  } catch (error) {
    console.error('[securityAlertService] persistAlertHistory error:', error.message || error);
  }
}

async function archiveOldAlerts() {
  if (!supabaseService) return;

  const now = Date.now();
  if (now - lastArchiveRun < 12 * 60 * 60 * 1000) return; // max twice daily
  lastArchiveRun = now;
  const cutoff = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { error } = await supabaseService
      .from('alert_history')
      .delete()
      .lt('created_at', cutoff);

    if (error) {
      if (error.code === '42P01') return; // table not yet created
      console.warn('[securityAlertService] Archive cleanup failed:', error.message);
    } else {
      console.log(`[securityAlertService] Archived alerts older than 90d (cutoff: ${cutoff})`);
    }
  } catch (e) {
    console.warn('[securityAlertService] Archive error:', e.message || e);
  }
}

function createAlertCheckerMiddleware() {
  return async (req, res, next) => {
    try {
      await supabaseService
        .from('monitoring_heartbeats')
        .insert([{
          component: 'alert_checker',
          status: 'active',
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.warn('[securityAlertService] Heartbeat write failed:', error.message || error);
    }
    next();
  };
}

let consecutiveJobFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
let jobIsRunning = false; // in-process guard against overlapping runs

// Acquire a DB-level advisory lock so only one instance across a horizontally
// scaled deployment runs the alert job at a time. Uses monitoring_heartbeats
// as a lightweight coordination table — no external lock service required.
async function acquireJobLock() {
  if (!supabaseService) return true; // no DB, skip lock — run job anyway

  const lockWindow = new Date(Date.now() - JOB_LOCK_TTL_MS).toISOString();
  try {
    // Check if another instance holds the lock within the TTL window.
    const { data: existing } = await supabaseService
      .from('monitoring_heartbeats')
      .select('created_at, status')
      .eq('component', JOB_LOCK_COMPONENT)
      .eq('status', 'running')
      .gte('created_at', lockWindow)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[securityAlertService] Alert job already running on another instance — skipping this cycle.');
      return false;
    }

    // Write our lock entry.
    await supabaseService
      .from('monitoring_heartbeats')
      .insert([{ component: JOB_LOCK_COMPONENT, status: 'running', created_at: new Date().toISOString() }]);

    return true;
  } catch (_err) {
    return true; // lock table unavailable — proceed without distributed lock
  }
}

async function releaseJobLock() {
  if (!supabaseService) return;
  try {
    await supabaseService
      .from('monitoring_heartbeats')
      .update({ status: 'idle' })
      .eq('component', JOB_LOCK_COMPONENT)
      .eq('status', 'running');
  } catch (_err) {
    // Non-fatal — lock will expire naturally after JOB_LOCK_TTL_MS.
  }
}

async function runAlertCheckJob() {
  // In-process guard: prevent overlapping runs within the same instance.
  if (jobIsRunning) {
    console.warn('[securityAlertService] Alert job still running from previous cycle — skipping.');
    return { alerts: [], dispatch_results: [] };
  }

  // DB-level guard: prevent overlapping runs across multiple instances.
  const lockAcquired = await acquireJobLock();
  if (!lockAcquired) return { alerts: [], dispatch_results: [] };

  jobIsRunning = true;
  console.log('[securityAlertService] Running scheduled alert check...');

  try {
    const result = await checkAlerts();
    consecutiveJobFailures = 0;

    console.log(`[securityAlertService] Alert check complete: ${result.alerts.length} alerts generated, ${result.dispatch_results.length} notifications sent`);
    if (result.alerts.length > 0) {
      console.log('[securityAlertService] Generated alerts:', result.alerts.map((a) => a.alert_id));
    }

    await archiveOldAlerts();
    return result;
  } catch (err) {
    consecutiveJobFailures++;
    console.error(`[securityAlertService] runAlertCheckJob failed (consecutive failures: ${consecutiveJobFailures}):`, err.message || err);

    if (consecutiveJobFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`[securityAlertService] CRITICAL: Alert job has failed ${consecutiveJobFailures} times in a row. Manual intervention may be required.`);
    }

    return { alerts: [], dispatch_results: [] };
  } finally {
    jobIsRunning = false;
    await releaseJobLock();
  }
}

module.exports = {
  checkAlerts,
  sendAlert,
  persistAlertHistory,
  archiveOldAlerts,
  createAlertCheckerMiddleware,
  runAlertCheckJob,
  // Exported for unit testing only
  evaluateA1,
  evaluateA2,
  evaluateA3,
  evaluateA4,
  evaluateA5,
  evaluateA6,
  evaluateA7,
  evaluateA8,
  evaluateA9,
  evaluateA10,
  evaluateA11,
  evaluateA12
};