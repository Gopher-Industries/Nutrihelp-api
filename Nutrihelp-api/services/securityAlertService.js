const https = require('https');
const nodemailer = require('nodemailer');

let supabaseService = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  } else {
    console.warn('[securityAlertService] Supabase env vars are missing. Alert checks will return empty datasets until configured.');
  }
} catch (error) {
  console.warn('[securityAlertService] Failed to initialize Supabase client:', error.message || error);
}

const ALERT_DEDUP_WINDOW_MS = 5 * 60 * 1000;
const HEARTBEAT_WINDOW_MS = 5 * 60 * 1000;

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
            'Temporarily suspend MFA retries for this account.',
            'Prompt user account verification and password reset.',
            'Investigate source IP and device consistency.'
          ]
        }
      )
    );
  });

  return alerts;
}

function evaluateA5(data, signalBook) {
  const rows = data.authLogs.filter((row) => {
    const ts = getTimestamp(row);
    const endpoint = getEndpoint(row);
    const statusCode = Number(row.status_code || row.http_status || row.status || 0);
    return ts && Date.now() - ts.getTime() <= 15 * 60 * 1000 && statusCode === 429 && isSensitiveEndpoint(endpoint);
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
    if (events.length < 30) return;
    const endpoints = [...new Set(events.map(getEndpoint).filter(Boolean))];
    alerts.push(
      createBaseAlert(
        'A5',
        'High',
        '30 or more 429 events from same IP on sensitive endpoints within 15 minutes',
        {
          source_ip: ip,
          rate_limit_hit_count: events.length,
          endpoint_distribution: endpoints,
          peak_rps_estimate: Number((events.length / (15 * 60)).toFixed(2)),
          status_code: 429,
          endpoint: endpoints[0] || null
        },
        {
          eventTimeWindow: '15m',
          fingerprint: ip,
          responseActions: [
            'Confirm abusive request burst pattern.',
            'Enforce stricter IP-based throttle or temporary ban.',
            'Verify no service degradation is occurring.',
            'Notify AI Lead if AI endpoint is involved.'
          ]
        }
      )
    );

    signalBook.push({ principal: null, sourceIps: [ip], alertId: 'A5' });
  });

  return alerts;
}

function evaluateA6(data, signalBook) {
  const rows = data.sessionLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 30 * 60 * 1000;
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
    if (events.length < 2) return;
    const countries = [...new Set(events.map((item) => item.country || item.geo_country).filter(Boolean))];
    const regions = [...new Set(events.map((item) => item.region || item.geo_region).filter(Boolean))];
    const impossibleTravel = events.some((item) => item.impossible_travel === true);
    const geoConflict = countries.length > 1 || regions.length > 1 || impossibleTravel;
    if (!geoConflict) return;

    alerts.push(
      createBaseAlert(
        'A6',
        'High',
        'Concurrent account sessions with conflicting geolocation metadata within 30 minutes',
        {
          account_identifier: principal,
          active_session_count: events.length,
          session_ids: events.map((item) => item.session_id).filter(Boolean),
          location_markers: { countries, regions },
          ip_addresses: [...new Set(events.map(getIp).filter(Boolean))],
          user_agents: [...new Set(events.map((item) => item.user_agent).filter(Boolean))],
          created_at_list: events.map((item) => getTimestamp(item)?.toISOString()).filter(Boolean)
        },
        {
          eventTimeWindow: '30m',
          fingerprint: principal,
          responseActions: [
            'Validate whether sessions are legitimate multi-device usage.',
            'Revoke suspicious sessions and force re-authentication.',
            'Flag account for enhanced monitoring.',
            'Notify user about suspicious session activity.'
          ]
        }
      )
    );

    signalBook.push({ principal, sourceIps: events.map(getIp).filter(Boolean), alertId: 'A6' });
  });

  return alerts;
}

function evaluateA7(data, signalBook) {
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
    let revokeReissueLoops = 0;
    for (let i = 0; i < events.length - 1; i += 1) {
      if (isRevokeEvent(events[i]) && isIssueEvent(events[i + 1])) {
        revokeReissueLoops += 1;
      }
    }

    if (events.length < 8 && revokeReissueLoops < 3) return;

    alerts.push(
      createBaseAlert(
        'A7',
        'High',
        'Token lifecycle anomaly: high token event volume or revoke/reissue loops within 10 minutes',
        {
          principal_id: principal,
          token_event_count: events.length,
          revoke_reissue_loops: revokeReissueLoops,
          refresh_endpoint_hits: events.filter((item) => getEventType(item).includes('refresh')).length,
          ip_addresses: [...new Set(events.map(getIp).filter(Boolean))],
          device_info: [...new Set(events.map((item) => item.device_id || item.user_agent).filter(Boolean))]
        },
        {
          eventTimeWindow: '10m',
          fingerprint: principal,
          responseActions: [
            'Inspect token service for replay or automation behavior.',
            'Revoke suspect refresh tokens.',
            'Validate client and device legitimacy.',
            'Check for abuse of refresh endpoint.'
          ]
        }
      )
    );

    signalBook.push({ principal, sourceIps: events.map(getIp).filter(Boolean), alertId: 'A7' });
  });

  return alerts;
}

function evaluateA8(signalBook, existingAlerts) {
  const highRisk = new Set(['A1', 'A2', 'A3', 'A5', 'A6', 'A7', 'A11']);
  const principalSignals = new Map();
  const ipSignals = new Map();

  signalBook.forEach((item) => {
    if (!highRisk.has(item.alertId)) return;
    if (item.principal) {
      if (!principalSignals.has(item.principal)) principalSignals.set(item.principal, new Set());
      principalSignals.get(item.principal).add(item.alertId);
    }

    (item.sourceIps || []).forEach((ip) => {
      if (!ip) return;
      if (!ipSignals.has(ip)) ipSignals.set(ip, new Set());
      ipSignals.get(ip).add(item.alertId);
    });
  });

  const alerts = [];

  principalSignals.forEach((set, principal) => {
    if (set.size < 3) return;
    const contributing = [...set];
    alerts.push(
      createBaseAlert(
        'A8',
        'Critical',
        'Correlated incident detected: 3 or more high-risk signals for same principal within 10 minutes',
        {
          correlation_confidence: Number(Math.min(0.95, 0.7 + set.size * 0.1).toFixed(2)),
          incident_fingerprint: `principal:${principal}`,
          contributing_alerts: contributing,
          timeline: existingAlerts
            .filter((item) => contributing.includes(item.alert_id))
            .map((item) => ({ alert_id: item.alert_id, generated_at: new Date().toISOString() })),
          impacted_accounts: [principal],
          impacted_ips: []
        },
        {
          eventTimeWindow: '10m',
          fingerprint: principal,
          responseActions: [
            'Open P1 incident bridge and assign incident commander.',
            'Contain attack path with IP/account/session controls.',
            'Preserve forensic evidence and timeline.',
            'Communicate impact status every 30 minutes.'
          ]
        }
      )
    );
  });

  ipSignals.forEach((set, ip) => {
    if (set.size < 3) return;
    const contributing = [...set];
    alerts.push(
      createBaseAlert(
        'A8',
        'Critical',
        'Correlated incident detected: 3 or more high-risk signals for same IP within 10 minutes',
        {
          correlation_confidence: Number(Math.min(0.95, 0.7 + set.size * 0.1).toFixed(2)),
          incident_fingerprint: `ip:${ip}`,
          contributing_alerts: contributing,
          timeline: existingAlerts
            .filter((item) => contributing.includes(item.alert_id))
            .map((item) => ({ alert_id: item.alert_id, generated_at: new Date().toISOString() })),
          impacted_accounts: [],
          impacted_ips: [ip]
        },
        {
          eventTimeWindow: '10m',
          fingerprint: ip,
          responseActions: [
            'Open P1 incident bridge and assign incident commander.',
            'Contain attack path with IP/account/session controls.',
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
    const eventType = getEventType(row);
    return ts && Date.now() - ts.getTime() <= 30 * 60 * 1000 && (eventType.includes('hash_mismatch') || eventType.includes('missing_file') || row.hash_mismatch === true || row.missing_file === true);
  });

  return rows.map((row) =>
    createBaseAlert(
      'A9',
      'Critical',
      'Integrity tamper event detected (hash mismatch or missing critical file)',
      {
        host_id: row.host_id || row.node_id || null,
        file_path: row.file_path || row.path || null,
        baseline_hash: row.baseline_hash || null,
        observed_hash: row.observed_hash || row.current_hash || null,
        tamper_type: row.hash_mismatch ? 'hash_mismatch' : row.missing_file ? 'missing_file' : getEventType(row),
        integrity_scan_id: row.scan_id || row.integrity_scan_id || null,
        last_known_good_build: row.last_known_good_build || null
      },
      {
        eventTimeWindow: '30m',
        fingerprint: row.file_path || row.host_id || 'integrity',
        responseActions: [
          'Isolate affected host/process from deployment pipeline.',
          'Compare artifact against trusted baseline.',
          'Roll back to known-good release if tampering confirmed.',
          'Start compromise investigation.'
        ]
      }
    )
  );
}

function evaluateA10(data) {
  const now = Date.now();
  const recentHeartbeats = data.heartbeatLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && now - ts.getTime() <= HEARTBEAT_WINDOW_MS;
  });

  const queryFailureCount = getWindowCount('queryFailures', HEARTBEAT_WINDOW_MS);
  const pipelineBlind = recentHeartbeats.length === 0;
  const persistentFailure = queryFailureCount >= 3;

  if (!pipelineBlind && !persistentFailure) {
    return [];
  }

  return [
    createBaseAlert(
      'A10',
      'High',
      'Monitoring pipeline failure detected: heartbeat absent >5 minutes or persistent query failure',
      {
        failing_component: pipelineBlind ? 'monitoring_heartbeats' : 'alert_query_engine',
        first_failure_time: pipelineBlind ? new Date(now - HEARTBEAT_WINDOW_MS).toISOString() : null,
        last_healthy_time: recentHeartbeats[0] ? getTimestamp(recentHeartbeats[0])?.toISOString() : null,
        error_samples: queryFailureCount,
        affected_tables: ['auth_logs', 'error_logs', 'session_logs', 'token_logs', 'integrity_logs'],
        backlog_estimate: pipelineBlind ? 'unknown' : 'low'
      },
      {
        eventTimeWindow: '5m',
        fingerprint: pipelineBlind ? 'heartbeat_absent' : 'query_failures',
        responseActions: [
          'Confirm outage scope and monitoring blind spot.',
          'Restart failed monitoring component.',
          'Verify backlog ingestion recovery.',
          'Record blind-spot duration and risk impact.'
        ]
      }
    )
  ];
}

function evaluateA11(data, signalBook) {
  const rows = data.errorLogs.filter((row) => {
    const ts = getTimestamp(row);
    if (!ts || Date.now() - ts.getTime() > 10 * 60 * 1000) return false;
    const category = normalizeString(row.category || row.error_category).toLowerCase();
    const endpoint = normalizeString(getEndpoint(row)).toLowerCase();
    const isSecurityRoute = endpoint.includes('/api/auth') || endpoint.includes('/api/login') || endpoint.includes('/api/session') || endpoint.includes('/api/security') || endpoint.includes('/api/chatbot') || endpoint.includes('/api/plan/generate');
    return category === 'critical' && isSecurityRoute;
  });

  if (rows.length === 0) {
    return [];
  }

  const severity = rows.length >= 3 ? 'Critical' : 'High';
  const sample = rows[0];
  const endpoint = getEndpoint(sample);

  const alert = createBaseAlert(
    'A11',
    severity,
    'Critical category security-route error detected (escalates if burst >=3 in 10 minutes)',
    {
      error_category: sample.category || sample.error_category || 'critical',
      error_type: sample.error_type || sample.type || null,
      error_message_class: sample.error_message || sample.message || null,
      endpoint,
      method: sample.method || null,
      ip_address: getIp(sample),
      trace_id: sample.request_id || sample.trace_id || null,
      repeat_count: rows.length
    },
    {
      eventTimeWindow: '10m',
      fingerprint: endpoint || 'security_error',
      responseActions: [
        'Identify failing endpoint and blast radius.',
        'Verify exploit attempt versus service defect.',
        'Apply hotfix or temporary route guard if needed.',
        'Escalate to incident if repeat burst is detected.'
      ]
    }
  );

  signalBook.push({ principal: getPrincipal(sample), sourceIps: [getIp(sample)].filter(Boolean), alertId: 'A11' });
  return [alert];
}

function evaluateA12(data) {
  const rows = data.cryptoLogs.filter((row) => {
    const ts = getTimestamp(row);
    return ts && Date.now() - ts.getTime() <= 15 * 60 * 1000;
  });

  if (rows.length === 0) {
    return [];
  }

  const decryptRows = rows.filter(isDecryptOperation);
  const decryptFailures = decryptRows.filter(isDecryptFailure);
  const failureRate = decryptRows.length === 0 ? 0 : decryptFailures.length / decryptRows.length;

  if (decryptFailures.length < 10 && failureRate < 0.3) {
    return [];
  }

  const sample = decryptFailures[0] || decryptRows[0];
  const endpoint = getEndpoint(sample);

  return [
    createBaseAlert(
      'A12',
      'High',
      'Encryption/decryption anomaly: >=10 decrypt failures or >=30% decrypt failure rate in 15 minutes',
      {
        crypto_operation: 'decrypt',
        failure_count: decryptFailures.length,
        failure_rate: Number((failureRate * 100).toFixed(2)),
        key_identifier: sample ? sample.key_identifier || sample.kid || null : null,
        key_version: sample ? sample.key_version || null : null,
        endpoint,
        source_ips: [...new Set(decryptFailures.map(getIp).filter(Boolean))]
      },
      {
        eventTimeWindow: '15m',
        fingerprint: sample ? sample.key_identifier || endpoint || 'crypto' : 'crypto',
        responseActions: [
          'Validate key usage and key version alignment.',
          'Verify malformed payload replay patterns.',
          'Inspect AI and API consumers for misuse.',
          'Rotate affected keys if compromise is suspected.'
        ]
      }
    )
  ];
}

function buildAlertSubject(alert) {
  return `[${alert.severity}] Nutri-Help Security Alert ${alert.alert_id}`;
}

function buildAlertText(alert) {
  return [
    `Alert ID: ${alert.alert_id}`,
    `Severity: ${alert.severity}`,
    `Trigger: ${alert.trigger_summary}`,
    `Triage SLA (minutes): ${alert.triage_sla_minutes}`,
    `Response Actions:`,
    ...alert.response_actions.map((item, index) => `${index + 1}. ${item}`),
    '',
    `Payload:`,
    JSON.stringify(alert.payload, null, 2)
  ].join('\n');
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);

    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let response = '';
        res.on('data', (chunk) => {
          response += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response || 'ok');
          } else {
            reject(new Error(`Slack webhook failed (${res.statusCode}): ${response}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendSlackNotification(alert) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return { attempted: false, reason: 'SLACK_WEBHOOK_URL not configured' };
  }

  const payload = {
    text: `${buildAlertSubject(alert)}\n${alert.trigger_summary}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${buildAlertSubject(alert)}*\n${alert.trigger_summary}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Payload*\n\`\`\`${JSON.stringify(alert.payload, null, 2)}\`\`\``
        }
      }
    ]
  };

  await postJson(webhookUrl, payload);
  return { attempted: true, channel: 'slack' };
}

function getEmailTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  const hasGmailConfig = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

  if (!hasSmtpConfig && !hasGmailConfig) {
    return null;
  }

  if (hasSmtpConfig) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  return cachedTransporter;
}

function getAlertRecipients() {
  const raw = process.env.ALERT_EMAIL_TO || process.env.SECURITY_ALERT_EMAIL_TO || '';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function sendEmailNotification(alert) {
  const recipients = getAlertRecipients();
  if (recipients.length === 0) {
    return { attempted: false, reason: 'No alert recipients configured (ALERT_EMAIL_TO)' };
  }

  const transporter = getEmailTransporter();
  if (!transporter) {
    return { attempted: false, reason: 'No SMTP or Gmail transporter configured' };
  }

  const fromAddress = process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER;

  await transporter.sendMail({
    from: fromAddress,
    to: recipients.join(', '),
    subject: buildAlertSubject(alert),
    text: buildAlertText(alert)
  });

  return { attempted: true, channel: 'email', recipients };
}

async function sendAlert(alert) {
  const fingerprint = alert.fingerprint || alert.payload.account_identifier || alert.payload.source_ip || 'global';
  if (!shouldSendDeduped(alert.alert_id, fingerprint)) {
    return { sent: false, deduped: true, alert_id: alert.alert_id, fingerprint };
  }

  console.log('[securityAlertService] ALERT', {
    alert_id: alert.alert_id,
    severity: alert.severity,
    trigger_summary: alert.trigger_summary,
    payload: alert.payload
  });

  const result = {
    sent: true,
    alert_id: alert.alert_id,
    channels: []
  };

  try {
    const emailResult = await sendEmailNotification(alert);
    result.channels.push(emailResult);
  } catch (error) {
    result.channels.push({ attempted: true, channel: 'email', error: error.message || String(error) });
    console.error('[securityAlertService] Email send failed:', error.message || error);
  }

  try {
    const slackResult = await sendSlackNotification(alert);
    result.channels.push(slackResult);
  } catch (error) {
    result.channels.push({ attempted: true, channel: 'slack', error: error.message || String(error) });
    console.error('[securityAlertService] Slack send failed:', error.message || error);
  }

  return result;
}

async function persistAlertHistory(alert, dispatchResult = {}, options = {}) {
  if (!supabaseService) {
    return { persisted: false, reason: 'supabase_unavailable' };
  }

  const createdAt = options.createdAt || new Date().toISOString();
  const fingerprint = alert.fingerprint || alert.payload?.account_identifier || alert.payload?.source_ip || 'global';
  const channels = Array.isArray(dispatchResult.channels) ? dispatchResult.channels : [];

  const entry = {
    alert_type: alert.alert_id,
    severity: normalizeString(alert.severity || 'medium').toLowerCase(),
    message: alert.trigger_summary || null,
    context: alert.payload || {},
    count: 1,
    fingerprint,
    source: options.source || null,
    status: 'open',
    notification_sent: dispatchResult.sent === true,
    notification_deduped: dispatchResult.deduped === true,
    notification_channels: channels,
    created_at: createdAt
  };

  try {
    const { error } = await supabaseService.from('alert_history').insert([entry]);

    if (error) {
      const relationMissing =
        (error.message && error.message.toLowerCase().includes('does not exist')) ||
        (error.details && String(error.details).toLowerCase().includes('does not exist')) ||
        error.code === '42P01';

      if (relationMissing) {
        if (!alertHistoryMissingWarned) {
          console.warn('[securityAlertService] alert_history table missing. Alert history persistence is disabled until table is created.');
          alertHistoryMissingWarned = true;
        }
        return { persisted: false, reason: 'table_missing' };
      }

      console.error('[securityAlertService] alert_history insert failed:', error.message || error);
      return { persisted: false, reason: error.message || String(error) };
    }

    return { persisted: true };
  } catch (error) {
    console.error('[securityAlertService] alert_history write error:', error.message || error);
    return { persisted: false, reason: error.message || String(error) };
  }
}

async function checkAlerts(options = {}) {
  const sendNotifications = options.send !== false;
  addWindowEvent('checkerHeartbeat', HEARTBEAT_WINDOW_MS);

  try {
    const data = await loadAlertData();
    const signalBook = [];

    const alerts = [];
    alerts.push(...evaluateA1(data, signalBook));
    alerts.push(...evaluateA2(data, signalBook));
    alerts.push(...evaluateA3(data, signalBook));
    alerts.push(...evaluateA4(data));
    alerts.push(...evaluateA5(data, signalBook));
    alerts.push(...evaluateA6(data, signalBook));
    alerts.push(...evaluateA7(data, signalBook));
    alerts.push(...evaluateA9(data));
    alerts.push(...evaluateA10(data));
    alerts.push(...evaluateA11(data, signalBook));
    alerts.push(...evaluateA12(data));
    alerts.push(...evaluateA8(signalBook, alerts));

    const dispatchResults = [];
    if (sendNotifications) {
      for (const alert of alerts) {
        try {
          const dispatch = await sendAlert(alert);
          await persistAlertHistory(alert, dispatch, {
            source: options.source || 'check-alerts',
            createdAt: new Date().toISOString()
          });
          dispatchResults.push(dispatch);
        } catch (error) {
          dispatchResults.push({
            sent: false,
            alert_id: alert.alert_id,
            error: error.message || String(error)
          });
        }
      }
    }

    // Write monitoring heartbeat so A10 can confirm the pipeline is alive
    if (supabaseService) {
      supabaseService
        .from('monitoring_heartbeats')
        .insert([{
          component_name: 'alert_checker',
          status: alerts.length > 0 ? 'alerts_generated' : 'healthy',
          message: `Check complete: ${alerts.length} alert(s) generated`,
          created_at: new Date().toISOString()
        }])
        .then(({ error: hbErr }) => {
          if (hbErr) {
            console.warn('[securityAlertService] Heartbeat write failed:', hbErr.message || hbErr);
          }
        })
        .catch((hbErr) => {
          console.warn('[securityAlertService] Heartbeat write error:', hbErr.message || hbErr);
        });
    }

    // Non-blocking 90-day retention cleanup (runs at most twice per day)
    archiveOldAlerts().catch(() => {});

    return {
      checked_at: new Date().toISOString(),
      total_alerts: alerts.length,
      alerts,
      dispatch_results: dispatchResults
    };
  } catch (error) {
    addWindowEvent('queryFailures', HEARTBEAT_WINDOW_MS);
    console.error('[securityAlertService] checkAlerts failed:', error.message || error);
    return {
      checked_at: new Date().toISOString(),
      total_alerts: 0,
      alerts: [],
      error: error.message || String(error)
    };
  }
}

function createAlertCheckerMiddleware(options = {}) {
  const intervalMs = Number(options.intervalMs || 60 * 1000);
  let lastRun = 0;

  return async function alertCheckerMiddleware(req, res, next) {
    const now = Date.now();
    if (now - lastRun >= intervalMs) {
      lastRun = now;
      checkAlerts({ send: true, source: 'middleware', request_id: req.id }).catch((error) => {
        console.error('[securityAlertService] Middleware check failed:', error.message || error);
      });
    }

    next();
  };
}

async function runAlertCheckJob() {
  return checkAlerts({ send: true, source: 'cron' });
}

async function archiveOldAlerts() {
  if (!supabaseService) return;
  const now = Date.now();
  if (now - lastArchiveRun < 12 * 60 * 60 * 1000) return; // max twice daily
  lastArchiveRun = now;
  const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { error } = await supabaseService
      .from('alert_history')
      .delete()
      .lt('created_at', cutoff);
    if (error) {
      if (error.code === '42P01') return; // table not yet created
      console.warn('[securityAlertService] Archive cleanup failed:', error.message);
    } else {
      console.log(`[securityAlertService] Archived alerts older than ${RETENTION_DAYS}d (cutoff: ${cutoff})`);
    }
  } catch (e) {
    console.warn('[securityAlertService] Archive error:', e.message || e);
  }
}

module.exports = {
  checkAlerts,
  sendAlert,
  persistAlertHistory,
  archiveOldAlerts,
  createAlertCheckerMiddleware,
  runAlertCheckJob
};
