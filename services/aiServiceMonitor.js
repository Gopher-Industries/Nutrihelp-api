/**
 * AI Service Monitor
 *
 * Provides evaluation hooks, quality tracking, and explainability metadata
 * for all AI-driven endpoints (image classification, recommendations,
 * meal plan generation, medical prediction, chatbot).
 *
 * Attach via:
 *   const monitor = require('./aiServiceMonitor');
 *   monitor.record('image_classification', result, durationMs);
 *
 * Stats are in-memory and reset on restart.  Integrate with a time-series DB
 * (e.g. InfluxDB, Supabase metrics table) for persistence.
 */

const logger = require('../utils/logger');

// ─── In-memory metrics store ───────────────────────────────────────────────

const metrics = {};

function initService(name) {
  if (!metrics[name]) {
    metrics[name] = {
      calls: 0,
      successes: 0,
      failures: 0,
      timeouts: 0,
      fallbacks: 0,
      totalDurationMs: 0,
      recentErrors: [],       // last 20 errors
      lastCalledAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
    };
  }
  return metrics[name];
}

// ─── Core recording ───────────────────────────────────────────────────────

/**
 * Record an AI service call result.
 *
 * @param {string}  serviceName  - e.g. 'image_classification', 'recommendation'
 * @param {Object}  result       - The result object from the AI service
 * @param {number}  durationMs   - Wall-clock time for the call
 * @param {Object}  [context]    - Optional metadata: userId, endpoint, input shape
 */
function record(serviceName, result, durationMs = 0, context = {}) {
  const m = initService(serviceName);
  const now = new Date().toISOString();

  m.calls++;
  m.totalDurationMs += durationMs;
  m.lastCalledAt = now;

  if (result?.timedOut) {
    m.timeouts++;
    m.failures++;
    m.lastFailureAt = now;
    _addError(m, 'timeout', durationMs, context);
  } else if (result?.success === false || result?.error) {
    m.failures++;
    m.lastFailureAt = now;
    _addError(m, result.error || 'unknown error', durationMs, context);
  } else {
    m.successes++;
    m.lastSuccessAt = now;
  }

  if (result?.fallbackUsed || result?.source?.ai?.fallbackUsed) {
    m.fallbacks++;
  }

  logger.debug(`[AIMonitor] ${serviceName}`, {
    success: !result?.error && result?.success !== false,
    durationMs,
    timedOut: result?.timedOut || false,
    fallback: m.fallbacks > 0,
    ...context,
  });
}

function _addError(m, message, durationMs, context) {
  m.recentErrors.push({
    message,
    durationMs,
    context,
    at: new Date().toISOString(),
  });
  if (m.recentErrors.length > 20) m.recentErrors.shift();
}

// ─── Stats retrieval ──────────────────────────────────────────────────────

/**
 * Get summary stats for one or all services.
 *
 * @param {string} [serviceName] - Omit to get all services
 * @returns {Object}
 */
function getStats(serviceName) {
  if (serviceName) {
    const m = metrics[serviceName];
    if (!m) return null;
    return _summarise(serviceName, m);
  }
  return Object.entries(metrics).reduce((acc, [name, m]) => {
    acc[name] = _summarise(name, m);
    return acc;
  }, {});
}

function _summarise(name, m) {
  const avgDurationMs = m.calls > 0 ? Math.round(m.totalDurationMs / m.calls) : 0;
  const successRate = m.calls > 0 ? ((m.successes / m.calls) * 100).toFixed(1) : '0.0';
  return {
    service: name,
    calls: m.calls,
    successes: m.successes,
    failures: m.failures,
    timeouts: m.timeouts,
    fallbacks: m.fallbacks,
    successRate: `${successRate}%`,
    avgDurationMs,
    lastCalledAt: m.lastCalledAt,
    lastSuccessAt: m.lastSuccessAt,
    lastFailureAt: m.lastFailureAt,
    recentErrors: m.recentErrors.slice(-5),
  };
}

// ─── Explainability metadata builder ─────────────────────────────────────

/**
 * Build a standard explainability block to attach to AI responses.
 *
 * @param {string}  serviceName
 * @param {Object}  result        - Raw AI result
 * @param {number}  durationMs
 * @returns {Object}
 */
function buildExplainability(serviceName, result, durationMs) {
  return {
    service: serviceName,
    durationMs,
    fallbackUsed: result?.fallbackUsed || result?.source?.ai?.fallbackUsed || false,
    timedOut: result?.timedOut || false,
    confidence: result?.confidence ?? null,
    warnings: result?.warnings || [],
    generatedAt: new Date().toISOString(),
  };
}

// ─── Circuit breaker state ────────────────────────────────────────────────

const circuitState = {};
const CIRCUIT_FAILURE_THRESHOLD = 5;   // open after N consecutive failures
const CIRCUIT_RESET_MS = 60_000;        // try again after 60s

function isCircuitOpen(serviceName) {
  const c = circuitState[serviceName];
  if (!c || c.state === 'closed') return false;

  if (c.state === 'open') {
    if (Date.now() - c.openedAt >= CIRCUIT_RESET_MS) {
      c.state = 'half-open';
      logger.info(`[AIMonitor] Circuit half-open for ${serviceName}`);
      return false;
    }
    return true;
  }
  return false;
}

function recordCircuit(serviceName, succeeded) {
  if (!circuitState[serviceName]) {
    circuitState[serviceName] = { state: 'closed', consecutiveFailures: 0 };
  }
  const c = circuitState[serviceName];

  if (succeeded) {
    c.consecutiveFailures = 0;
    if (c.state === 'half-open') {
      c.state = 'closed';
      logger.info(`[AIMonitor] Circuit closed for ${serviceName}`);
    }
  } else {
    c.consecutiveFailures++;
    if (c.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      c.state = 'open';
      c.openedAt = Date.now();
      logger.warn(`[AIMonitor] Circuit OPEN for ${serviceName} after ${c.consecutiveFailures} consecutive failures`);
    }
  }
}

function getCircuitState(serviceName) {
  return circuitState[serviceName]?.state || 'closed';
}

// ─── Reset (for tests) ────────────────────────────────────────────────────

function reset(serviceName) {
  if (serviceName) {
    delete metrics[serviceName];
    delete circuitState[serviceName];
  } else {
    Object.keys(metrics).forEach((k) => delete metrics[k]);
    Object.keys(circuitState).forEach((k) => delete circuitState[k]);
  }
}

module.exports = {
  record,
  getStats,
  buildExplainability,
  isCircuitOpen,
  recordCircuit,
  getCircuitState,
  reset,
};
