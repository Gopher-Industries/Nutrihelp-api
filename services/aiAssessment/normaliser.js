'use strict';

/**
 * Normalises whatever the AI model returns into the contract's `prediction`
 * block (FE-06).
 *
 * The audit for FE-06 found the model's output is not consistent today:
 *   - confidence arrives as 0-1 (0.798) or 0-100 (79.8)
 *   - `diabetes` arrives as a boolean, a number or a sentence
 *     ("Potential diabetes risk signal detected")
 *   - `medical_report` arrives as an object or a one-item array
 *   - there is no model version
 * The screen must never deal with that, so every variant is handled here and
 * anything the normaliser cannot interpret becomes `null` plus a warning,
 * never a guess.
 */

const BMI_BANDS = [
  { max: 18.5, code: 'underweight', label: 'Underweight' },
  { max: 25, code: 'healthy', label: 'Healthy weight' },
  { max: 30, code: 'overweight', label: 'Overweight' },
  { max: 35, code: 'obese_1', label: 'Obesity class I' },
  { max: 40, code: 'obese_2', label: 'Obesity class II' },
  { max: Infinity, code: 'obese_3', label: 'Obesity class III' },
];

const MODEL_LABEL_TO_CODE = {
  Insufficient_Weight: 'underweight',
  Normal_Weight: 'healthy',
  Overweight_Level_I: 'overweight',
  Overweight_Level_II: 'overweight',
  Obesity_Type_I: 'obese_1',
  Obesity_Type_II: 'obese_2',
  Obesity_Type_III: 'obese_3',
};

const CODE_TO_LABEL = Object.fromEntries(BMI_BANDS.map((b) => [b.code, b.label]));

const POSITIVE_WORDS = ['true', 'yes', 'positive', 'detected', '1'];
const NEGATIVE_WORDS = ['false', 'no', 'negative', 'not detected', '0', 'no risk', 'none'];

function readThresholds(env = process.env) {
  const confidence = Number(env.AI_ASSESSMENT_CONFIDENCE_THRESHOLD);
  const [moderate, high] = String(env.AI_ASSESSMENT_DIABETES_RISK_THRESHOLDS || '')
    .split(',')
    .map(Number);
  return {
    confidence: confidence > 0 && confidence < 1 ? confidence : 0.6,
    // Placeholder cut-offs, to be confirmed with the T2D model owner.
    diabetesModerate: moderate > 0 && moderate < 1 ? moderate : 0.3,
    diabetesHigh: high > 0 && high < 1 ? high : 0.6,
  };
}

function round(value, dp) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function computeBmi(inputs) {
  const m = inputs.heightCm / 100;
  return round(inputs.weightKg / (m * m), 1);
}

function bmiCategory(bmi) {
  return BMI_BANDS.find((band) => bmi < band.max);
}

/** 0-1 stays, 1-100 is treated as a percentage, anything else is unusable. */
function toUnitInterval(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n <= 1) return round(n, 3);
  if (n <= 100) return round(n / 100, 3);
  return null;
}

/** true, false, or null when the value cannot be read safely. */
function toPositive(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value > 0 : null;
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();
  if (!s) return null;
  if (NEGATIVE_WORDS.includes(s) || /\bno\b.*\b(risk|signal)\b/.test(s) || /\bnot\b/.test(s)) return false;
  if (POSITIVE_WORDS.includes(s) || /\b(detected|elevated|positive)\b/.test(s)) return true;
  return null;
}

function riskLevelFromProbability(probability, thresholds) {
  if (probability === null) return null;
  if (probability >= thresholds.diabetesHigh) return 'high';
  if (probability >= thresholds.diabetesModerate) return 'moderate';
  return 'low';
}

/** Pull the report object out of the known payload shapes. */
function extractReport(payload) {
  const body = payload && (payload.data || payload);
  let report = body && (body.medical_report || body.medicalReport || body.report);
  if (Array.isArray(report)) report = report[0];
  return report && typeof report === 'object' ? report : null;
}

function extractModel(payload, report) {
  const body = (payload && (payload.data || payload)) || {};
  const version = body.model_version || body.modelVersion || report.model_version || report.modelVersion;
  const name = body.model_name || body.modelName || report.model_name || report.modelName;
  return {
    name: name ? String(name) : 'nutrihelp-medical-report',
    version: version ? String(version) : 'unversioned',
  };
}

/**
 * Build the prediction block for an AI model response.
 *
 * @param {object} payload  raw model payload (body.medical_report etc.)
 * @param {object} inputs   validated contract inputs
 * @param {object} [thresholds]
 * @returns {{ prediction: object, model: object, warnings: string[] } | null}
 *          null when the payload holds no usable report
 */
function normaliseModelPayload(payload, inputs, thresholds = readThresholds()) {
  const report = extractReport(payload);
  if (!report) return null;

  const warnings = [];
  const bmi = computeBmi(inputs);
  const bmiBand = bmiCategory(bmi);

  // Weight category
  const obesity = report.obesity_prediction || report.obesityPrediction || null;
  const modelLabel = obesity && (obesity.obesity_level || obesity.obesityLevel);
  const modelCode = modelLabel ? MODEL_LABEL_TO_CODE[modelLabel] : null;
  let weightCategory;
  if (modelCode) {
    weightCategory = {
      code: modelCode,
      label: CODE_TO_LABEL[modelCode],
      modelLabel: String(modelLabel),
      confidence: toUnitInterval(obesity.confidence),
      agreesWithBmi: modelCode === bmiBand.code,
    };
    if (!weightCategory.agreesWithBmi) warnings.push('model_disagrees_with_bmi');
  } else {
    warnings.push('weight_prediction_missing');
    weightCategory = { code: bmiBand.code, label: bmiBand.label, modelLabel: null, confidence: null, agreesWithBmi: null };
  }

  // Diabetes
  const rawDiabetes = report.diabetes_prediction || report.diabetesPrediction || null;
  let diabetes = null;
  if (rawDiabetes && typeof rawDiabetes === 'object') {
    const probability = toUnitInterval(
      rawDiabetes.probability ?? rawDiabetes.risk_probability ?? rawDiabetes.riskProbability
    );
    diabetes = {
      positive: toPositive(rawDiabetes.diabetes ?? rawDiabetes.positive),
      riskLevel: riskLevelFromProbability(probability, thresholds),
      probability,
      confidence: toUnitInterval(rawDiabetes.confidence),
    };
    if (probability === null) warnings.push('probability_unavailable');
    if (diabetes.positive === null && probability === null) {
      diabetes = null;
      warnings.push('diabetes_prediction_missing');
    }
  } else {
    warnings.push('diabetes_prediction_missing');
  }

  const confidences = [weightCategory.confidence, diabetes && diabetes.confidence].filter((c) => c !== null && c !== undefined);
  const lowConfidence = confidences.some((c) => c < thresholds.confidence);
  if (lowConfidence) warnings.push('low_confidence');
  const nothingFromModel = !modelCode && !diabetes;

  return {
    prediction: {
      status: 'available',
      source: 'ai_model',
      uncertain: lowConfidence || confidences.length === 0 || nothingFromModel,
      bmi,
      weightCategory,
      diabetes,
    },
    model: extractModel(payload, report),
    warnings,
  };
}

/**
 * Prediction block when the model could not be used. Only facts the backend
 * can compute exactly (BMI) are returned; no diabetes estimate is invented.
 */
function buildFallbackPrediction(inputs) {
  const bmi = computeBmi(inputs);
  const band = bmiCategory(bmi);
  return {
    status: 'unavailable',
    source: 'fallback_estimate',
    uncertain: true,
    bmi,
    weightCategory: { code: band.code, label: band.label, modelLabel: null, confidence: null, agreesWithBmi: null },
    diabetes: null,
  };
}

module.exports = {
  readThresholds,
  computeBmi,
  bmiCategory,
  toUnitInterval,
  toPositive,
  riskLevelFromProbability,
  extractReport,
  normaliseModelPayload,
  buildFallbackPrediction,
};
