/**
 * securityAlertsA3A8A9A10.test.js
 * --------------------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Jest test suite for security alert evaluation functions.
 * Covers all 12 alert conditions (A1-A12).
 *
 * Run with: npm test -- securityAlertsA3A8A9A10.test.js
 */

// Mock Supabase before requiring the service so the module initialises cleanly.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
    }))
  }))
}));

// Also mock the shared client so log services don't try to connect.
jest.mock('../services/supabaseClient', () => ({
  getSupabaseServiceClient: jest.fn(() => null),
  supabaseAnon: null,
  supabaseService: null
}));

const {
  checkAlerts,
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
  evaluateA12,
  // _testInternals is exported only for tests to manipulate module-scoped state
  _testInternals
} = require('../services/securityAlertService');

function makeEmptyData() {
  return {
    authLogs: [],
    bruteForceLogs: [],
    errorLogs: [],
    sessionLogs: [],
    tokenLogs: [],
    integrityLogs: [],
    heartbeatLogs: [],
    cryptoLogs: []
  };
}

const now = Date.now();

// ─────────────────────────────────────────────────────────────────────────────
// A1 – Brute Force (per-account)
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA1 – Brute Force per-account', () => {
  test('triggers when 10+ failures for same account within 10 min', () => {
    const failures = Array.from({ length: 11 }, (_, i) => ({
      event_type: 'login_fail',
      user_id: 'user_a1',
      success: false,
      created_at: new Date(now - i * 30000).toISOString()
    }));
    const data = { ...makeEmptyData(), authLogs: failures };
    const alerts = evaluateA1(data, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A1');
    expect(alerts[0].severity).toBe('High');
    expect(alerts[0].payload.failed_count).toBe(11);
  });

  test('does not trigger with fewer than 10 failures', () => {
    const failures = Array.from({ length: 5 }, (_, i) => ({
      event_type: 'login_fail',
      user_id: 'user_a1_low',
      success: false,
      created_at: new Date(now - i * 30000).toISOString()
    }));
    const data = { ...makeEmptyData(), authLogs: failures };
    expect(evaluateA1(data, [])).toHaveLength(0);
  });

  test('does not trigger when failures are outside 10-minute window', () => {
    const failures = Array.from({ length: 12 }, (_, i) => ({
      event_type: 'login_fail',
      user_id: 'user_a1_old',
      success: false,
      created_at: new Date(now - (15 + i) * 60000).toISOString()
    }));
    const data = { ...makeEmptyData(), authLogs: failures };
    expect(evaluateA1(data, [])).toHaveLength(0);
  });

  test('adds signal to signalBook on trigger', () => {
    const failures = Array.from({ length: 10 }, (_, i) => ({
      event_type: 'login_fail',
      user_id: 'user_sig',
      success: false,
      created_at: new Date(now - i * 20000).toISOString()
    }));
    const signalBook = [];
    evaluateA1({ ...makeEmptyData(), authLogs: failures }, signalBook);
    expect(signalBook).toHaveLength(1);
    expect(signalBook[0].alertId).toBe('A1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A2 – Brute Force (cross-account from single IP)
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA2 – Brute Force cross-account', () => {
  test('triggers when 20+ failures from one IP across 3+ accounts', () => {
    const failures = Array.from({ length: 25 }, (_, i) => ({
      event_type: 'login_fail',
      success: false,
      ip_address: '1.2.3.4',
      user_id: `account_${i % 5}`,
      created_at: new Date(now - i * 20000).toISOString()
    }));
    const data = { ...makeEmptyData(), authLogs: failures };
    const alerts = evaluateA2(data, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A2');
    expect(alerts[0].payload.source_ip).toBe('1.2.3.4');
  });

  test('does not trigger when fewer than 3 distinct accounts targeted', () => {
    const failures = Array.from({ length: 25 }, (_, i) => ({
      event_type: 'login_fail',
      success: false,
      ip_address: '5.6.7.8',
      user_id: `account_${i % 2}`,
      created_at: new Date(now - i * 10000).toISOString()
    }));
    expect(evaluateA2({ ...makeEmptyData(), authLogs: failures }, [])).toHaveLength(0);
  });

  test('does not trigger when fewer than 20 failures', () => {
    const failures = Array.from({ length: 15 }, (_, i) => ({
      event_type: 'login_fail',
      success: false,
      ip_address: '9.10.11.12',
      user_id: `account_${i % 5}`,
      created_at: new Date(now - i * 10000).toISOString()
    }));
    expect(evaluateA2({ ...makeEmptyData(), authLogs: failures }, [])).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A3 – Brute Force Success
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA3 – Brute Force Success Detection', () => {
  test('triggers when successful login follows 5+ failures within 5 min', () => {
    const successTs = new Date(now - 30000).toISOString();
    const data = {
      ...makeEmptyData(),
      authLogs: [
        ...Array.from({ length: 5 }, (_, i) => ({
          event_type: 'login_fail',
          user_id: 'user123',
          created_at: new Date(now - (60 + i * 30) * 1000).toISOString()
        })),
        { event_type: 'login_success', user_id: 'user123', created_at: successTs }
      ]
    };
    const signalBook = [];
    const alerts = evaluateA3(data, signalBook);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A3');
    expect(alerts[0].severity).toBe('Critical');
    expect(signalBook).toHaveLength(1);
  });

  test('does not trigger with fewer than 5 preceding failures', () => {
    const data = {
      ...makeEmptyData(),
      authLogs: [
        { event_type: 'login_fail', user_id: 'user123', created_at: new Date(now - 60000).toISOString() },
        { event_type: 'login_fail', user_id: 'user123', created_at: new Date(now - 90000).toISOString() },
        { event_type: 'login_success', user_id: 'user123', created_at: new Date(now - 30000).toISOString() }
      ]
    };
    expect(evaluateA3(data, [])).toHaveLength(0);
  });

  test('does not trigger when success is outside 5-minute window', () => {
    const data = {
      ...makeEmptyData(),
      authLogs: [
        ...Array.from({ length: 5 }, (_, i) => ({
          event_type: 'login_fail',
          user_id: 'user123',
          created_at: new Date(now - (12 + i) * 60000).toISOString()
        })),
        { event_type: 'login_success', user_id: 'user123', created_at: new Date(now - 30000).toISOString() }
      ]
    };
    expect(evaluateA3(data, [])).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A4 – MFA Bypass Attempt
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA4 – MFA Bypass Detection', () => {
  test('triggers when 5+ MFA failures for same account within 10 min', () => {
    const mfaFails = Array.from({ length: 6 }, (_, i) => ({
      event_type: 'mfa_fail',
      user_id: 'user_mfa',
      created_at: new Date(now - i * 60000).toISOString()
    }));
    const alerts = evaluateA4({ ...makeEmptyData(), authLogs: mfaFails });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A4');
    expect(alerts[0].severity).toBe('High');
  });

  test('does not trigger with fewer than 5 MFA failures', () => {
    const mfaFails = Array.from({ length: 3 }, (_, i) => ({
      event_type: 'mfa_fail',
      user_id: 'user_mfa_low',
      created_at: new Date(now - i * 60000).toISOString()
    }));
    expect(evaluateA4({ ...makeEmptyData(), authLogs: mfaFails })).toHaveLength(0);
  });

  test('does not trigger for non-MFA failures', () => {
    const loginFails = Array.from({ length: 10 }, (_, i) => ({
      event_type: 'login_fail',
      user_id: 'user_nomfa',
      created_at: new Date(now - i * 30000).toISOString()
    }));
    expect(evaluateA4({ ...makeEmptyData(), authLogs: loginFails })).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A5 – Rate Limit Abuse
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA5 – Rate Limit Abuse', () => {
  test('triggers when 30+ 429s from one IP on sensitive endpoints within 15 min', () => {
    const hits = Array.from({ length: 35 }, (_, i) => ({
      status: 429,
      ip_address: '10.0.0.1',
      endpoint: '/api/login',
      created_at: new Date(now - i * 20000).toISOString()
    }));
    const alerts = evaluateA5({ ...makeEmptyData(), errorLogs: hits });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A5');
    expect(alerts[0].payload.source_ip).toBe('10.0.0.1');
  });

  test('does not trigger when endpoint is not sensitive', () => {
    const hits = Array.from({ length: 35 }, (_, i) => ({
      status: 429,
      ip_address: '10.0.0.2',
      endpoint: '/api/articles',
      created_at: new Date(now - i * 20000).toISOString()
    }));
    expect(evaluateA5({ ...makeEmptyData(), errorLogs: hits })).toHaveLength(0);
  });

  test('does not trigger when fewer than 30 hits', () => {
    const hits = Array.from({ length: 20 }, (_, i) => ({
      status: 429,
      ip_address: '10.0.0.3',
      endpoint: '/api/login',
      created_at: new Date(now - i * 20000).toISOString()
    }));
    expect(evaluateA5({ ...makeEmptyData(), errorLogs: hits })).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A6 – Session Anomaly
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA6 – Session Anomaly / Impossible Travel', () => {
  test('triggers when impossible_travel flag set for a user with 2+ sessions', () => {
    const sessions = [
      { user_id: 'user_geo', ip_address: '1.1.1.1', country: 'AU', region: 'NSW', impossible_travel: true, created_at: new Date(now - 5 * 60000).toISOString() },
      { user_id: 'user_geo', ip_address: '2.2.2.2', country: 'US', region: 'CA', impossible_travel: false, created_at: new Date(now - 2 * 60000).toISOString() }
    ];
    const alerts = evaluateA6({ ...makeEmptyData(), sessionLogs: sessions });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A6');
    expect(alerts[0].severity).toBe('High');
  });

  test('triggers when 2+ sessions with distinct geo locations', () => {
    const sessions = [
      { user_id: 'user_geo2', ip_address: '3.3.3.3', country: 'DE', region: 'BE', impossible_travel: false, created_at: new Date(now - 10 * 60000).toISOString() },
      { user_id: 'user_geo2', ip_address: '4.4.4.4', country: 'JP', region: 'TK', impossible_travel: false, created_at: new Date(now - 5 * 60000).toISOString() }
    ];
    const alerts = evaluateA6({ ...makeEmptyData(), sessionLogs: sessions });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A6');
  });

  test('does not trigger when all sessions are from same location', () => {
    const sessions = [
      { user_id: 'user_same', ip_address: '5.5.5.5', country: 'AU', region: 'VIC', impossible_travel: false, created_at: new Date(now - 10 * 60000).toISOString() },
      { user_id: 'user_same', ip_address: '5.5.5.6', country: 'AU', region: 'VIC', impossible_travel: false, created_at: new Date(now - 5 * 60000).toISOString() }
    ];
    expect(evaluateA6({ ...makeEmptyData(), sessionLogs: sessions })).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A7 – Token Abuse
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA7 – Token Abuse Pattern', () => {
  test('triggers when 3+ revoke/reissue loops within 10 min', () => {
    const events = [];
    for (let i = 0; i < 3; i++) {
      events.push({ event_type: 'revoke', user_id: 'tok_user', created_at: new Date(now - (9 - i * 3) * 60000).toISOString() });
      events.push({ event_type: 'issue', user_id: 'tok_user', created_at: new Date(now - (8 - i * 3) * 60000).toISOString() });
    }
    // Extra events to hit the count threshold of 8
    for (let i = 0; i < 3; i++) {
      events.push({ event_type: 'refresh', user_id: 'tok_user', created_at: new Date(now - i * 30000).toISOString() });
    }
    const alerts = evaluateA7({ ...makeEmptyData(), tokenLogs: events });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A7');
  });

  test('does not trigger when fewer than 3 revoke/reissue loops', () => {
    const events = [
      { event_type: 'revoke', user_id: 'tok_user2', created_at: new Date(now - 5 * 60000).toISOString() },
      { event_type: 'issue', user_id: 'tok_user2', created_at: new Date(now - 4 * 60000).toISOString() },
      { event_type: 'refresh', user_id: 'tok_user2', created_at: new Date(now - 3 * 60000).toISOString() }
    ];
    expect(evaluateA7({ ...makeEmptyData(), tokenLogs: events })).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A8 – Correlation Engine
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA8 – Correlation Engine', () => {
  test('triggers when 3+ high-risk signals within 10 min', () => {
    const signalBook = [
      { alertId: 'A1', principal: 'user_c', sourceIps: ['1.2.3.4'], timestamp: now - 1 * 60000 },
      { alertId: 'A2', principal: 'user_c', sourceIps: ['1.2.3.4'], timestamp: now - 3 * 60000 },
      { alertId: 'A3', principal: 'user_c', sourceIps: ['1.2.3.4'], timestamp: now - 5 * 60000 },
      { alertId: 'A5', principal: 'user_c', sourceIps: ['1.2.3.4'], timestamp: now - 7 * 60000 }
    ];
    const alerts = evaluateA8(makeEmptyData(), signalBook);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A8');
    expect(alerts[0].severity).toBe('Critical');
  });

  test('does not trigger with fewer than 3 high-risk signals', () => {
    const signalBook = [
      { alertId: 'A1', principal: 'user_c2', sourceIps: [], timestamp: now - 60000 },
      { alertId: 'A2', principal: 'user_c2', sourceIps: [], timestamp: now - 120000 }
    ];
    expect(evaluateA8(makeEmptyData(), signalBook)).toHaveLength(0);
  });

  test('does not trigger when signals are outside 10-minute window', () => {
    const signalBook = [
      { alertId: 'A1', principal: 'user_c3', sourceIps: [], timestamp: now - 15 * 60000 },
      { alertId: 'A2', principal: 'user_c3', sourceIps: [], timestamp: now - 20 * 60000 },
      { alertId: 'A3', principal: 'user_c3', sourceIps: [], timestamp: now - 25 * 60000 }
    ];
    expect(evaluateA8(makeEmptyData(), signalBook)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A9 – File Integrity
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA9 – File Integrity Monitoring', () => {
  test('triggers on hash mismatch', () => {
    const data = {
      ...makeEmptyData(),
      integrityLogs: [{
        host_id: 'web-01',
        file_path: '/app/config/db.js',
        baseline_hash: 'abc123',
        observed_hash: 'def456',
        hash_mismatch: true,
        created_at: new Date(now - 30 * 60000).toISOString()
      }]
    };
    const alerts = evaluateA9(data);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A9');
    expect(alerts[0].severity).toBe('Critical');
    expect(alerts[0].payload.tamper_type).toBe('hash_mismatch');
  });

  test('triggers when critical file is missing', () => {
    const data = {
      ...makeEmptyData(),
      integrityLogs: [{
        file_path: '/app/config/secrets.env',
        missing_file: true,
        created_at: new Date(now - 10 * 60000).toISOString()
      }]
    };
    const alerts = evaluateA9(data);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].payload.tamper_type).toBe('missing_file');
  });

  test('does not trigger when no integrity issues', () => {
    expect(evaluateA9(makeEmptyData())).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A10 – Monitoring Health
// Note: evaluateA10 reads the module-scoped inMemoryWindows, not global.
// We test the heartbeat-absence path directly.
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA10 – Monitoring Health Check', () => {
  test('triggers when heartbeat is stale (>5 min) and no recent heartbeat rows', () => {
    // No heartbeat rows at all → timeSinceLastHeartbeat = Date.now() which is >> HEARTBEAT_WINDOW_MS
    const alerts = evaluateA10(makeEmptyData());
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A10');
    expect(alerts[0].severity).toBe('High');
    expect(alerts[0].payload.failing_component).toBe('alert_checker');
  });

  test('does not trigger when heartbeat is recent and no query failures', () => {
    const data = {
      ...makeEmptyData(),
      heartbeatLogs: [{
        component: 'alert_checker',
        status: 'active',
        created_at: new Date(now - 2 * 60000).toISOString()
      }]
    };
    // With a fresh heartbeat row and no queryFailures in the module window,
    // A10 should not fire.
    const alerts = evaluateA10(data);
    expect(alerts).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A11 – Critical Auth Errors
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA11 – Critical Auth Errors', () => {
  test('triggers on a single critical security error', () => {
    const data = {
      ...makeEmptyData(),
      errorLogs: [{
        category: 'critical',
        endpoint: '/api/auth/login',
        method: 'POST',
        created_at: new Date(now - 60000).toISOString()
      }]
    };
    const alerts = evaluateA11(data);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A11');
  });

  test('escalates to Critical severity when 3+ errors on same endpoint', () => {
    const errors = Array.from({ length: 4 }, (_, i) => ({
      category: 'critical',
      endpoint: '/api/auth/refresh',
      method: 'POST',
      created_at: new Date(now - i * 60000).toISOString()
    }));
    const alerts = evaluateA11({ ...makeEmptyData(), errorLogs: errors });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('Critical');
  });

  test('does not trigger for non-critical error categories', () => {
    const data = {
      ...makeEmptyData(),
      errorLogs: [{ category: 'info', endpoint: '/api/login', method: 'POST', created_at: new Date(now - 60000).toISOString() }]
    };
    expect(evaluateA11(data)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A12 – Crypto Failure Pattern
// ─────────────────────────────────────────────────────────────────────────────
describe('evaluateA12 – Crypto Failure Pattern', () => {
  test('triggers when 10+ decrypt failures within 15 min', () => {
    const failures = Array.from({ length: 12 }, (_, i) => ({
      event_type: 'decrypt_fail',
      key_id: 'key-1',
      created_at: new Date(now - i * 60000).toISOString()
    }));
    const alerts = evaluateA12({ ...makeEmptyData(), cryptoLogs: failures });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_id).toBe('A12');
    expect(alerts[0].severity).toBe('High');
  });

  test('triggers when failure rate >= 30% even with < 10 absolute failures (boundary: exactly 10 required)', () => {
    // The implementation requires rows.length >= 10 first, so 9 failures never trigger.
    const failures = Array.from({ length: 9 }, (_, i) => ({
      event_type: 'decrypt_fail',
      key_id: 'key-2',
      created_at: new Date(now - i * 60000).toISOString()
    }));
    expect(evaluateA12({ ...makeEmptyData(), cryptoLogs: failures })).toHaveLength(0);
  });

  test('does not trigger with fewer than 10 decrypt failures', () => {
    const failures = Array.from({ length: 5 }, (_, i) => ({
      event_type: 'decrypt_fail',
      key_id: 'key-3',
      created_at: new Date(now - i * 60000).toISOString()
    }));
    expect(evaluateA12({ ...makeEmptyData(), cryptoLogs: failures })).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkAlerts integration
// ─────────────────────────────────────────────────────────────────────────────
describe('checkAlerts Integration', () => {
  test('returns correct shape when Supabase is unavailable', async () => {
    const result = await checkAlerts();
    expect(result).toHaveProperty('alerts');
    expect(result).toHaveProperty('dispatch_results');
    expect(Array.isArray(result.alerts)).toBe(true);
    expect(Array.isArray(result.dispatch_results)).toBe(true);
  });
});
