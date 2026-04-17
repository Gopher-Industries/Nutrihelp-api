'use strict';

/**
 * alertCheckerCron.js
 * --------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Standalone cron-style runner for the securityAlertService.
 * Runs checkAlerts() on a configurable interval and logs results.
 *
 * Use as:
 *   1. A background process:  node scripts/alertCheckerCron.js
 *   2. Imported in server.js: require('./scripts/alertCheckerCron').start();
 *   3. Via the Express middleware approach (see bottom of file).
 *
 * Environment variables:
 *   ALERT_CHECK_INTERVAL_MS  - How often to run (default: 60000 = 60s)
 *   ALERT_CHECK_ENABLED      - Set to 'false' to disable (default: true)
 */

require('dotenv').config();

const { checkAlerts, createAlertCheckerMiddleware } = require('../services/securityAlertService');

const INTERVAL_MS = Number(process.env.ALERT_CHECK_INTERVAL_MS || 60 * 1000);
const ENABLED = String(process.env.ALERT_CHECK_ENABLED || 'true').toLowerCase() !== 'false';

let intervalHandle = null;

// ---------------------------------------------------------------------------
// Core runner
// ---------------------------------------------------------------------------

async function runOnce() {
  const startedAt = Date.now();
  try {
    const result = await checkAlerts({ send: true, source: 'cron' });
    const elapsedMs = Date.now() - startedAt;

    if (result.total_alerts > 0) {
      console.log(
        `[alertCheckerCron] Check complete — ${result.total_alerts} alert(s) generated (${elapsedMs}ms)`
      );
      result.alerts.forEach((a) => {
        console.log(`  ↳ [${a.severity}] ${a.alert_id}: ${a.trigger_summary}`);
      });
    } else {
      console.log(`[alertCheckerCron] Check complete — no alerts (${elapsedMs}ms)`);
    }

    return result;
  } catch (err) {
    console.error('[alertCheckerCron] runOnce failed:', err.message || err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Start / stop lifecycle
// ---------------------------------------------------------------------------

function start() {
  if (!ENABLED) {
    console.log('[alertCheckerCron] Disabled via ALERT_CHECK_ENABLED env var. Skipping.');
    return;
  }

  if (intervalHandle) {
    console.warn('[alertCheckerCron] Already running.');
    return;
  }

  console.log(`[alertCheckerCron] Starting — checking every ${INTERVAL_MS / 1000}s`);

  // Run immediately on start, then on schedule
  runOnce();
  intervalHandle = setInterval(runOnce, INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[alertCheckerCron] Stopped.');
  }
}

// ---------------------------------------------------------------------------
// Express integration example
// ---------------------------------------------------------------------------
// In your server.js:
//
//   const alertChecker = require('./scripts/alertCheckerCron');
//
//   // Option A: interval-based checker (fire-and-forget every 60s)
//   alertChecker.start();
//
//   // Option B: per-request middleware throttled to max once per 60s
//   const { createAlertCheckerMiddleware } = require('./services/securityAlertService');
//   app.use(createAlertCheckerMiddleware({ intervalMs: 60000 }));
//
//   // Option C: manual REST endpoint (admin auth required)
//   app.post('/admin/security/check-alerts', authenticateAdmin, async (req, res) => {
//     const result = await checkAlerts({ send: true, source: 'manual' });
//     res.json(result);
//   });

// ---------------------------------------------------------------------------
// Run directly if invoked as a script
// ---------------------------------------------------------------------------

if (require.main === module) {
  start();
}

module.exports = { start, stop, runOnce, createAlertCheckerMiddleware };
