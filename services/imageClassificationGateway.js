/**
 * imageClassificationGateway.js
 *
 * Central gateway for the image-classification feature.
 *
 *   ┌──────────┐   image bytes   ┌──────────────────────────────┐
 *   │ Route    │ ───────────────▶│ gateway.classify(imageBuffer)│
 *   └──────────┘                 └──────────────┬───────────────┘
 *                                               │
 *                             ┌─────────────────┼───────────────────┐
 *                             ▼                 ▼                   ▼
 *                     primary AI script   fallback script      error path
 *                  (TF model on disk)   (PIL heuristic)    (normalised fail)
 *
 * Responsibilities:
 *   • Read the image once and hand the buffer to whichever runner wins.
 *   • Respect the circuit-breaker in `aiServiceMonitor` — if the primary is
 *     known-bad we go straight to the fallback.
 *   • Normalise every outcome to the shared contract
 *     (see services/imageClassificationContract.js).
 *   • Flag predictions with confidence below the configured threshold as
 *     `uncertain` so the frontend can render a neutral "we're not sure"
 *     state instead of a confident-looking wrong answer.
 *   • Always return an object (never throw) so the controller layer can
 *     stay thin.
 */

const path = require('path');
const { executePythonScript } = require('./aiExecutionService');
const monitor = require('./aiServiceMonitor');
const {
  SERVICE_NAME,
  DEFAULT_CONFIDENCE_THRESHOLD,
  buildSuccessPayload,
} = require('./imageClassificationContract');

const FALLBACK_SERVICE_NAME = 'image_classification_fallback';

const DEFAULT_PRIMARY_SCRIPT = path.join(__dirname, '..', 'model', 'imageClassification.py');
const DEFAULT_FALLBACK_SCRIPT = path.join(
  __dirname,
  '..',
  'model',
  'imageClassificationFallback.py'
);

// Injected dependencies default to the real executor; tests can pass in a
// mock runner that simulates the various failure modes without spawning
// Python at all.
function createGateway(overrides = {}) {
  const primaryScript = overrides.primaryScript || DEFAULT_PRIMARY_SCRIPT;
  const fallbackScript = overrides.fallbackScript || DEFAULT_FALLBACK_SCRIPT;
  const runner = overrides.runner || executePythonScript;
  const serviceMonitor = overrides.monitor || monitor;
  const threshold =
    typeof overrides.confidenceThreshold === 'number'
      ? overrides.confidenceThreshold
      : DEFAULT_CONFIDENCE_THRESHOLD;
  const primaryTimeoutMs = overrides.primaryTimeoutMs || 30000;
  const fallbackTimeoutMs = overrides.fallbackTimeoutMs || 10000;

  async function runPrimary(imageBuffer) {
    const start = Date.now();
    const result = await runner({
      scriptPath: primaryScript,
      stdin: imageBuffer,
      serviceName: SERVICE_NAME,
      timeoutMs: primaryTimeoutMs,
    });
    return { result, durationMs: Date.now() - start };
  }

  async function runFallback(imageBuffer, extraWarnings = []) {
    const start = Date.now();
    const result = await runner({
      scriptPath: fallbackScript,
      stdin: imageBuffer,
      serviceName: FALLBACK_SERVICE_NAME,
      timeoutMs: fallbackTimeoutMs,
      // The fallback does not participate in the primary's circuit breaker.
      skipCircuit: true,
      // Fallback never retries — a misbehaving fallback should fail fast.
      maxRetries: 0,
    });

    return {
      result: {
        ...result,
        warnings: [...(result.warnings || []), ...extraWarnings],
      },
      durationMs: Date.now() - start,
    };
  }

  /**
   * Classify an image buffer.
   *
   * @param {Buffer} imageBuffer  Raw bytes of the uploaded image.
   * @param {Object} [options]
   * @param {boolean} [options.skipPrimary=false]  Force fallback (for tests/admin).
   * @returns {Promise<{ok: boolean, httpStatus: number, code?: string, error?: string, data?: Object}>}
   */
  async function classify(imageBuffer, options = {}) {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      return {
        ok: false,
        httpStatus: 400,
        code: 'IMAGE_EMPTY',
        error: 'Uploaded image is empty or unreadable.',
      };
    }

    const circuitOpen = serviceMonitor.isCircuitOpen(SERVICE_NAME);
    const skipPrimary = Boolean(options.skipPrimary);
    const warnings = [];

    let primaryResult = null;
    let primaryDurationMs = 0;
    let shouldUseFallback = false;

    if (circuitOpen || skipPrimary) {
      shouldUseFallback = true;
      warnings.push(circuitOpen ? 'circuit_open' : 'primary_skipped');
    } else {
      const r = await runPrimary(imageBuffer);
      primaryResult = r.result;
      primaryDurationMs = r.durationMs;

      if (!primaryResult.success) {
        shouldUseFallback = true;
        if (primaryResult.timedOut) warnings.push('primary_timeout');
        else warnings.push('primary_failed');
      }
    }

    if (!shouldUseFallback) {
      return {
        ok: true,
        httpStatus: 200,
        data: buildSuccessPayload({
          rawLabel: primaryResult.prediction,
          confidence: primaryResult.confidence,
          source: 'ai',
          durationMs: primaryDurationMs,
          warnings: primaryResult.warnings || [],
          timedOut: primaryResult.timedOut,
          circuitOpen: false,
          threshold,
        }),
      };
    }

    // Fallback path.
    const { result: fallbackResult, durationMs: fallbackDurationMs } = await runFallback(
      imageBuffer,
      warnings
    );

    if (!fallbackResult.success) {
      // Both primary and fallback failed — this is the only path where we
      // actually return a service-unavailable error to the caller.  We keep
      // the shape identical to other failures (no partial data leak).
      return {
        ok: false,
        httpStatus: 503,
        code: 'AI_SERVICE_UNAVAILABLE',
        error: 'Image classification is temporarily unavailable. Please try again.',
        meta: {
          explainability: {
            service: SERVICE_NAME,
            source: 'none',
            fallbackUsed: true,
            timedOut: Boolean(primaryResult && primaryResult.timedOut),
            circuitOpen,
            durationMs: primaryDurationMs + fallbackDurationMs,
            warnings: [...warnings, 'fallback_failed'],
            generatedAt: new Date().toISOString(),
          },
        },
      };
    }

    return {
      ok: true,
      httpStatus: 200,
      data: buildSuccessPayload({
        rawLabel: fallbackResult.prediction,
        confidence: fallbackResult.confidence,
        source: 'fallback',
        durationMs: primaryDurationMs + fallbackDurationMs,
        warnings: fallbackResult.warnings || warnings,
        timedOut: Boolean(primaryResult && primaryResult.timedOut),
        circuitOpen,
        threshold,
      }),
    };
  }

  return { classify };
}

// Default singleton so controllers can `require('./imageClassificationGateway')`
// directly without wiring.
const defaultGateway = createGateway();

module.exports = {
  createGateway,
  classify: (...args) => defaultGateway.classify(...args),
  FALLBACK_SERVICE_NAME,
};
