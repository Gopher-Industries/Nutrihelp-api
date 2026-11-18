'use strict';

/**
 * AI Assessment Prediction Gateway (FE-06).
 *
 * The one place the backend talks to the AI model on behalf of the
 * assessment screen. Follows the same pattern as imageClassificationGateway:
 *
 *   contract inputs
 *     │
 *     ├─ circuit open?  ── yes ──► fallback (BMI only), warning circuit_open
 *     │
 *     ├─ map inputs to model features (featureMapper)
 *     ├─ call the model through MedicalPredictionService with a hard timeout
 *     │     timeout       ──► fallback, warning model_timeout
 *     │     network/HTTP  ──► fallback, warning model_unreachable
 *     │     unreadable    ──► fallback, warning model_bad_response
 *     ├─ normalise the model's output (normaliser)
 *     └─ record metrics + circuit state in aiServiceMonitor
 *
 * It never throws for model problems: the screen always gets a contract
 * payload and decides what to show from `prediction.status`.
 */

const logger = require('../../utils/logger');
const defaultMonitor = require('../aiServiceMonitor');
const { MedicalPredictionService } = require('../medicalPredictionService');
const { CONTRACT_VERSION, SERVICE_NAME, DISCLAIMER } = require('../../contracts/ai-assessment/v1');
const { toModelFeatures } = require('./featureMapper');
const { normaliseModelPayload, buildFallbackPrediction, readThresholds } = require('./normaliser');

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_ASSESSMENT_MODEL_TIMEOUT_MS) || 8000;

class ModelTimeoutError extends Error {}

function createGateway(overrides = {}) {
  const monitor = overrides.monitor || defaultMonitor;
  const predictionService = overrides.predictionService || new MedicalPredictionService();
  const baseFetch = overrides.fetch || global.fetch;
  const timeoutMs = overrides.timeoutMs || DEFAULT_TIMEOUT_MS;
  const now = overrides.now || (() => Date.now());
  const thresholds = overrides.thresholds || readThresholds();

  /** Call the model; resolves with the raw payload or rejects with a typed error. */
  async function callModel(features) {
    if (typeof baseFetch !== 'function') throw new Error('fetch unavailable');

    // Passing a fetch makes MedicalPredictionService throw on failure instead
    // of silently returning its local estimate, so the source is always true.
    const timedFetch = (url, init = {}) => baseFetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ModelTimeoutError(`model exceeded ${timeoutMs}ms`)), timeoutMs + 250);
    });
    try {
      const result = await Promise.race([predictionService.predict(features, { fetch: timedFetch }), deadline]);
      return result && result.body;
    } catch (error) {
      if (error instanceof ModelTimeoutError) throw error;
      const reason = error && (error.details?.detail || error.message || '');
      if (/abort|timeout|timed out/i.test(String(reason)) || error?.name === 'TimeoutError') {
        throw new ModelTimeoutError(String(reason));
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function payload({ prediction, model, source, warnings, startedAt, timedOut = false, circuitOpen = false }) {
    return {
      prediction,
      model,
      explainability: {
        service: SERVICE_NAME,
        source,
        fallbackUsed: source === 'fallback_estimate',
        timedOut,
        circuitOpen,
        durationMs: Math.max(0, Math.round(now() - startedAt)),
        confidenceThreshold: thresholds.confidence,
        warnings: [...new Set(warnings)],
        generatedAt: new Date(now()).toISOString(),
        contractVersion: CONTRACT_VERSION,
      },
      disclaimer: DISCLAIMER,
    };
  }

  function fallback(inputs, startedAt, warning, extra = {}) {
    return payload({
      prediction: buildFallbackPrediction(inputs),
      model: null,
      source: 'fallback_estimate',
      warnings: [warning],
      startedAt,
      ...extra,
    });
  }

  /**
   * @param {object} inputs   validated contract inputs
   * @param {object} [context] { userId } for monitoring only, never sent to the model
   * @returns {Promise<object>} the contract `data` block
   */
  async function predict(inputs, context = {}) {
    const startedAt = now();

    if (monitor.isCircuitOpen(SERVICE_NAME)) {
      monitor.record(SERVICE_NAME, { success: true, fallbackUsed: true }, 0, { reason: 'circuit_open' });
      return fallback(inputs, startedAt, 'circuit_open', { circuitOpen: true });
    }

    let raw;
    try {
      raw = await callModel(toModelFeatures(inputs));
    } catch (error) {
      const timedOut = error instanceof ModelTimeoutError;
      const durationMs = now() - startedAt;
      monitor.record(SERVICE_NAME, { timedOut, error: error.message, fallbackUsed: true }, durationMs, { userId: context.userId });
      monitor.recordCircuit(SERVICE_NAME, false);
      logger.warn('AI assessment model call failed; serving fallback', { timedOut, reason: error.message });
      return fallback(inputs, startedAt, timedOut ? 'model_timeout' : 'model_unreachable', { timedOut });
    }

    const normalised = normaliseModelPayload(raw, inputs, thresholds);
    const durationMs = now() - startedAt;

    if (!normalised) {
      monitor.record(SERVICE_NAME, { error: 'bad_response', fallbackUsed: true }, durationMs, { userId: context.userId });
      monitor.recordCircuit(SERVICE_NAME, false);
      return fallback(inputs, startedAt, 'model_bad_response');
    }

    monitor.record(SERVICE_NAME, { success: true }, durationMs, { userId: context.userId });
    monitor.recordCircuit(SERVICE_NAME, true);
    return payload({
      prediction: normalised.prediction,
      model: normalised.model,
      source: 'ai_model',
      warnings: normalised.warnings,
      startedAt,
    });
  }

  return { predict };
}

module.exports = { createGateway, ModelTimeoutError };
