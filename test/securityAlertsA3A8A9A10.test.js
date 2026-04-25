/**
 * securityAlertsA3A8A9A10.test.js
 * --------------------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Jest test suite for security alert evaluation functions.
 * Tests A3 (Brute Force Success), A8 (Correlation Engine),
 * A9 (File Integrity), and A10 (Monitoring Health).
 *
 * Run with: npm test -- securityAlertsA3A8A9A10.test.js
 */

const {
  checkAlerts,
  evaluateA3,
  evaluateA8,
  evaluateA9,
  evaluateA10
} = require('../../services/securityAlertService');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 1 },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('Security Alert Service - A3, A8, A9, A10 Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateA3 - Brute Force Success Detection', () => {
    test('should trigger A3 when successful login follows 5+ failed attempts within 5 minutes', () => {
      const mockData = {
        authLogs: [
          // Failed attempts
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:00:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:01:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:02:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:03:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:04:00Z' },
          // Success after failures
          { event_type: 'login_success', user_id: 'user123', created_at: '2024-01-01T10:04:30Z' }
        ],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const signalBook = [];
      const alerts = evaluateA3(mockData, signalBook);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alert_id).toBe('A3');
      expect(alerts[0].severity).toBe('Critical');
      expect(alerts[0].payload.account_identifier).toBe('user123');
      expect(alerts[0].payload.preceding_failed_count).toBe(5);
      expect(signalBook).toHaveLength(1);
      expect(signalBook[0].alertId).toBe('A3');
    });

    test('should not trigger A3 when success is not preceded by enough failures', () => {
      const mockData = {
        authLogs: [
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:00:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:01:00Z' },
          { event_type: 'login_success', user_id: 'user123', created_at: '2024-01-01T10:02:00Z' }
        ],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const signalBook = [];
      const alerts = evaluateA3(mockData, signalBook);

      expect(alerts).toHaveLength(0);
      expect(signalBook).toHaveLength(0);
    });

    test('should not trigger A3 when success occurs after 5+ minute window', () => {
      const mockData = {
        authLogs: [
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:00:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:01:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:02:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:03:00Z' },
          { event_type: 'login_fail', user_id: 'user123', created_at: '2024-01-01T10:04:00Z' },
          // Success 6 minutes later (outside 5-minute window)
          { event_type: 'login_success', user_id: 'user123', created_at: '2024-01-01T10:10:00Z' }
        ],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const signalBook = [];
      const alerts = evaluateA3(mockData, signalBook);

      expect(alerts).toHaveLength(0);
      expect(signalBook).toHaveLength(0);
    });
  });

  describe('evaluateA8 - Correlation Engine', () => {
    test('should trigger A8 when 3+ high-risk signals detected within 10 minutes', () => {
      const signalBook = [
        { alertId: 'A1', timestamp: Date.now() - 1 * 60 * 1000 },
        { alertId: 'A2', timestamp: Date.now() - 3 * 60 * 1000 },
        { alertId: 'A3', timestamp: Date.now() - 5 * 60 * 1000 },
        { alertId: 'A5', timestamp: Date.now() - 7 * 60 * 1000 }
      ];

      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const alerts = evaluateA8(mockData, signalBook);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alert_id).toBe('A8');
      expect(alerts[0].severity).toBe('Critical');
      expect(alerts[0].payload.correlation_confidence).toBe(0.85);
      expect(alerts[0].payload.contributing_alerts).toContain('A1');
      expect(alerts[0].payload.contributing_alerts).toContain('A3');
    });

    test('should not trigger A8 with fewer than 3 high-risk signals', () => {
      const signalBook = [
        { alertId: 'A1', timestamp: Date.now() - 1 * 60 * 1000 },
        { alertId: 'A2', timestamp: Date.now() - 3 * 60 * 1000 }
      ];

      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const alerts = evaluateA8(mockData, signalBook);

      expect(alerts).toHaveLength(0);
    });

    test('should not trigger A8 when signals are outside 10-minute window', () => {
      const signalBook = [
        { alertId: 'A1', timestamp: Date.now() - 15 * 60 * 1000 }, // 15 minutes ago
        { alertId: 'A2', timestamp: Date.now() - 20 * 60 * 1000 }, // 20 minutes ago
        { alertId: 'A3', timestamp: Date.now() - 25 * 60 * 1000 }  // 25 minutes ago
      ];

      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const alerts = evaluateA8(mockData, signalBook);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('evaluateA9 - File Integrity Monitoring', () => {
    test('should trigger A9 when hash mismatch detected', () => {
      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [
          {
            host_id: 'web-server-01',
            file_path: '/app/config/database.js',
            baseline_hash: 'abc123',
            observed_hash: 'def456',
            hash_mismatch: true,
            scan_id: 'scan-2024-001',
            last_good_build: 'v1.2.3',
            created_at: '2024-01-01T10:00:00Z'
          }
        ],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const alerts = evaluateA9(mockData);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alert_id).toBe('A9');
      expect(alerts[0].severity).toBe('Critical');
      expect(alerts[0].payload.file_path).toBe('/app/config/database.js');
      expect(alerts[0].payload.hash_mismatch).toBe(true);
      expect(alerts[0].payload.baseline_hash).toBe('abc123');
      expect(alerts[0].payload.observed_hash).toBe('def456');
    });

    test('should trigger A9 when critical file is missing', () => {
      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [
          {
            host_id: 'web-server-01',
            file_path: '/app/config/secrets.env',
            baseline_hash: 'secret123',
            observed_hash: null,
            hash_mismatch: false,
            missing_file: true,
            scan_id: 'scan-2024-002',
            created_at: '2024-01-01T10:00:00Z'
          }
        ],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const alerts = evaluateA9(mockData);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alert_id).toBe('A9');
      expect(alerts[0].severity).toBe('Critical');
      expect(alerts[0].payload.file_path).toBe('/app/config/secrets.env');
      expect(alerts[0].payload.missing_file).toBe(true);
    });

    test('should not trigger A9 when no integrity issues detected', () => {
      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [],
        cryptoLogs: []
      };

      const alerts = evaluateA9(mockData);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('evaluateA10 - Monitoring Health Check', () => {
    test('should trigger A10 when heartbeat absent for >5 minutes', () => {
      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [
          {
            component: 'alert_checker',
            status: 'active',
            created_at: '2024-01-01T09:50:00Z' // 15 minutes ago
          }
        ],
        cryptoLogs: []
      };

      // Mock inMemoryWindows to simulate query failures
      const originalWindows = global.inMemoryWindows;
      global.inMemoryWindows = {
        queryFailures: [Date.now() - 6 * 60 * 1000], // 6 minutes ago
        checkerHeartbeat: []
      };

      const alerts = evaluateA10(mockData);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alert_id).toBe('A10');
      expect(alerts[0].severity).toBe('High');
      expect(alerts[0].payload.failing_component).toBe('alert_checker');
      expect(alerts[0].payload.error_samples).toBeDefined();

      // Restore original
      global.inMemoryWindows = originalWindows;
    });

    test('should not trigger A10 when heartbeat is recent and no failures', () => {
      const mockData = {
        authLogs: [],
        bruteForceLogs: [],
        errorLogs: [],
        sessionLogs: [],
        tokenLogs: [],
        integrityLogs: [],
        heartbeatLogs: [
          {
            component: 'alert_checker',
            status: 'active',
            created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
          }
        ],
        cryptoLogs: []
      };

      const alerts = evaluateA10(mockData);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('checkAlerts Integration', () => {
    test('should return alerts and dispatch results structure', async () => {
      const result = await checkAlerts();

      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('dispatch_results');
      expect(Array.isArray(result.alerts)).toBe(true);
      expect(Array.isArray(result.dispatch_results)).toBe(true);
    });

    test('should handle Supabase unavailability gracefully', async () => {
      // Temporarily mock Supabase as unavailable
      const originalEnv = process.env.SUPABASE_URL;
      delete process.env.SUPABASE_URL;

      const result = await checkAlerts();

      expect(result.alerts).toEqual([]);
      expect(result.dispatch_results).toEqual([]);

      // Restore
      process.env.SUPABASE_URL = originalEnv;
    });
  });
});