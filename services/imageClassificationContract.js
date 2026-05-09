/**
 * imageClassificationContract.js
 *
 * Single source of truth for the image-classification response contract.
 *
 * Every outcome (AI success, fallback success, uncertainty, validation error,
 * service failure) is normalised into the SAME top-level shape so the frontend
 * can rely on a single payload structure.
 *
 * Shape returned under `data` on success:
 *
 *   {
 *     classification: {
 *       label:           string | null,     // Human-friendly label (may be null when uncertain)
 *       rawLabel:        string | null,     // Unmodified label from the model
 *       calories:        { value, unit } | null,
 *       confidence:      number | null,     // 0..1
 *       uncertain:       boolean,           // true when confidence < threshold
 *       source:          'ai' | 'fallback' | 'none',
 *       fallbackUsed:    boolean,
 *       alternatives:    Array<{ label, confidence }>
 *     },
 *     explainability: {
 *       service:             'image_classification',
 *       source:              'ai' | 'fallback' | 'none',
 *       fallbackUsed:        boolean,
 *       timedOut:            boolean,
 *       circuitOpen:         boolean,
 *       durationMs:          number,
 *       confidence:          number | null,
 *       confidenceThreshold: number,
 *       warnings:            string[],
 *       generatedAt:         ISO string,
 *       contractVersion:     'v1'
 *     }
 *   }
 *
 * On error the response uses the shared `fail()` helper and the body is
 *   { success: false, error, code }
 * The frontend should always check `success` first and only then read `data`.
 */

const CONTRACT_VERSION = 'v1';
const SERVICE_NAME = 'image_classification';

// Predictions with confidence below this threshold are flagged as uncertain.
// The value is intentionally conservative so that low-quality matches are
// never surfaced as definitive answers to the user.
const DEFAULT_CONFIDENCE_THRESHOLD = Number(
  process.env.IMAGE_CLASSIFICATION_CONFIDENCE_THRESHOLD || 0.6
);

/**
 * Parse a raw label of the form "Apple Braeburn:~52 calories per 100 grams"
 * into structured { label, calories } fields.  If the input does not match
 * the expected shape, the raw string is returned as-is as the label and
 * calories is null.
 *
 * @param {string|null|undefined} rawLabel
 * @returns {{ label: string|null, calories: { value: number, unit: string } | null }}
 */
function parseRawLabel(rawLabel) {
  if (!rawLabel || typeof rawLabel !== 'string') {
    return { label: null, calories: null };
  }

  const trimmed = rawLabel.trim();
  const match = trimmed.match(/^(.*?):\s*~?\s*(\d+(?:\.\d+)?)\s*calories\s*per\s*100\s*grams$/i);
  if (match) {
    return {
      label: match[1].trim(),
      calories: { value: Number(match[2]), unit: 'kcal/100g' },
    };
  }

  // Some ad-hoc scripts may emit just the label with no calorie annotation.
  return { label: trimmed, calories: null };
}

/**
 * Build the normalised `classification` block.
 *
 * @param {Object} opts
 * @param {string|null} [opts.rawLabel]
 * @param {number|null} [opts.confidence]
 * @param {'ai'|'fallback'|'none'} [opts.source]
 * @param {number} [opts.threshold]
 * @param {Array<{label:string, confidence:number}>} [opts.alternatives]
 * @returns {Object}
 */
function buildClassification({
  rawLabel = null,
  confidence = null,
  source = 'none',
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
  alternatives = [],
} = {}) {
  const { label, calories } = parseRawLabel(rawLabel);
  const normalizedConfidence =
    typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : null;

  const uncertain =
    normalizedConfidence === null || normalizedConfidence < threshold || !label;

  return {
    label: uncertain ? null : label,
    rawLabel: rawLabel || null,
    calories: uncertain ? null : calories,
    confidence: normalizedConfidence,
    uncertain,
    source,
    fallbackUsed: source === 'fallback',
    alternatives: Array.isArray(alternatives) ? alternatives : [],
  };
}

/**
 * Build the explainability / traceability block that accompanies every
 * classification response.  The frontend can use it to show provenance
 * ("answered by the fallback model", "AI service was slow", etc.) and the
 * backend monitor can attach its own metrics on top.
 *
 * @param {Object} opts
 * @returns {Object}
 */
function buildExplainability({
  source = 'none',
  durationMs = 0,
  confidence = null,
  warnings = [],
  timedOut = false,
  circuitOpen = false,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
} = {}) {
  return {
    service: SERVICE_NAME,
    source,
    fallbackUsed: source === 'fallback',
    timedOut: Boolean(timedOut),
    circuitOpen: Boolean(circuitOpen),
    durationMs,
    confidence: typeof confidence === 'number' ? confidence : null,
    confidenceThreshold: threshold,
    warnings: Array.isArray(warnings) ? warnings : [],
    generatedAt: new Date().toISOString(),
    contractVersion: CONTRACT_VERSION,
  };
}

/**
 * Convenience helper: given a raw gateway result, produce the `data` block
 * that should be passed to `ok()` on a success path.
 */
function buildSuccessPayload(gatewayResult) {
  const {
    rawLabel,
    confidence,
    source,
    durationMs,
    warnings,
    timedOut,
    circuitOpen,
    alternatives,
    threshold,
  } = gatewayResult;

  const classification = buildClassification({
    rawLabel,
    confidence,
    source,
    alternatives,
    threshold,
  });

  const explainability = buildExplainability({
    source,
    durationMs,
    confidence,
    warnings,
    timedOut,
    circuitOpen,
    threshold,
  });

  return { classification, explainability };
}

module.exports = {
  CONTRACT_VERSION,
  SERVICE_NAME,
  DEFAULT_CONFIDENCE_THRESHOLD,
  parseRawLabel,
  buildClassification,
  buildExplainability,
  buildSuccessPayload,
};
