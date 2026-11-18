'use strict';

/**
 * AI Assessment Prediction Contract, v1 (FE-06).
 *
 * The agreement between the assessment screen (web and Expo mobile) and the
 * backend for how AI model predictions are requested and returned.
 *
 * This file is shared by both sides, so it deliberately has NO dependencies
 * and uses CommonJS: it runs unchanged in Node (backend, tests) and in the
 * Expo / Metro bundler (mobile). Copy the whole `contracts/ai-assessment/v1`
 * folder into the mobile app; do not edit it there. Changes are made here and
 * agreed by both teams, and anything that breaks a consumer bumps the version.
 *
 * What it holds:
 *   - CONTRACT_VERSION, the version both sides send and check
 *   - INPUT_FIELDS, the request fields in plain units (the backend Joi schema
 *     and the mobile form are generated from it)
 *   - ENUMS and ERROR_CODES, the closed sets both sides switch on
 *   - toScreenState(), one mapping from any response to a UI state and copy
 *   - createAiAssessmentClient(), a fetch-based client with timeout and mock mode
 */

const CONTRACT_VERSION = 'v1';
const SERVICE_NAME = 'assessment_prediction';

const ENDPOINTS = Object.freeze({
  contract: '/api/ai-assessment/contract',
  predict: '/api/ai-assessment/predict',
});

const ENUMS = Object.freeze({
  sex: ['female', 'male'],
  frequency: ['never', 'sometimes', 'frequently', 'always'],
  vegetableFrequency: ['rarely', 'sometimes', 'always'],
  transport: ['car', 'public_transport', 'motorbike', 'bicycle', 'walking'],
  predictionStatus: ['available', 'unavailable'],
  predictionSource: ['ai_model', 'fallback_estimate'],
  diabetesRiskLevel: ['low', 'moderate', 'high'],
  weightCategory: [
    'underweight',
    'healthy',
    'overweight',
    'obese_1',
    'obese_2',
    'obese_3',
  ],
  warning: [
    'model_timeout',
    'model_unreachable',
    'model_bad_response',
    'circuit_open',
    'low_confidence',
    'probability_unavailable',
    'diabetes_prediction_missing',
    'weight_prediction_missing',
    'model_disagrees_with_bmi',
  ],
  screenState: ['ready', 'uncertain', 'fallback', 'invalid_input', 'needs_login', 'rate_limited', 'error'],
});

const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONTRACT_VERSION_UNSUPPORTED: 'CONTRACT_VERSION_UNSUPPORTED',
  RATE_LIMITED: 'AI_ASSESSMENT_RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Raised by the shared auth middleware.
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INVALID_AUTH_HEADER: 'INVALID_AUTH_HEADER',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_TOKEN_TYPE: 'INVALID_TOKEN_TYPE',
  // Raised by the client only, never by the server.
  NETWORK_ERROR: 'NETWORK_ERROR',
  CLIENT_TIMEOUT: 'CLIENT_TIMEOUT',
  BAD_RESPONSE: 'BAD_RESPONSE',
});

const AUTH_ERROR_CODES = [
  ERROR_CODES.TOKEN_MISSING,
  ERROR_CODES.TOKEN_INVALID,
  ERROR_CODES.INVALID_AUTH_HEADER,
  ERROR_CODES.INVALID_TOKEN,
  ERROR_CODES.INVALID_TOKEN_TYPE,
];

/**
 * Request fields, in the units a person understands. The screen never sends
 * model feature codes (FAVC, CAEC, ...): the backend maps these to whatever
 * the current model needs, so the model can change without a screen release.
 *
 * `usedBy` documents why a field exists:
 *   current_model  the deployed obesity / diabetes model needs it
 *   t2d_model      proposed for the Type 2 Diabetes model (pending agreement)
 */
const INPUT_FIELDS = Object.freeze([
  { id: 'sex', type: 'enum', values: ENUMS.sex, required: true, usedBy: ['current_model', 't2d_model'] },
  { id: 'ageYears', type: 'integer', min: 16, max: 100, unit: 'years', required: true, usedBy: ['current_model', 't2d_model'] },
  { id: 'heightCm', type: 'number', min: 120, max: 230, unit: 'cm', required: true, usedBy: ['current_model'] },
  { id: 'weightKg', type: 'number', min: 30, max: 300, unit: 'kg', required: true, usedBy: ['current_model'] },
  { id: 'waistCm', type: 'number', min: 40, max: 200, unit: 'cm', required: false, usedBy: ['t2d_model'] },
  { id: 'familyHistoryOverweight', type: 'boolean', required: true, usedBy: ['current_model'] },
  { id: 'familyHistoryDiabetes', type: 'boolean', required: false, usedBy: ['t2d_model'] },
  { id: 'highBloodGlucoseHistory', type: 'boolean', required: false, usedBy: ['t2d_model'] },
  { id: 'bloodPressureMedication', type: 'boolean', required: false, usedBy: ['t2d_model'] },
  { id: 'smoker', type: 'boolean', required: true, usedBy: ['current_model', 't2d_model'] },
  { id: 'vegetableFrequency', type: 'enum', values: ENUMS.vegetableFrequency, required: true, usedBy: ['current_model', 't2d_model'] },
  { id: 'mainMealsPerDay', type: 'integer', min: 1, max: 4, unit: 'meals (4 = more than three)', required: true, usedBy: ['current_model'] },
  { id: 'snackingFrequency', type: 'enum', values: ENUMS.frequency, required: true, usedBy: ['current_model'] },
  { id: 'highCalorieFoods', type: 'boolean', required: true, usedBy: ['current_model'] },
  { id: 'waterLitresPerDay', type: 'number', min: 0, max: 10, unit: 'litres', required: true, usedBy: ['current_model'] },
  { id: 'monitorsCalories', type: 'boolean', required: true, usedBy: ['current_model'] },
  { id: 'activityDaysPerWeek', type: 'integer', min: 0, max: 7, unit: 'days', required: true, usedBy: ['current_model', 't2d_model'] },
  { id: 'screenTimeHoursPerDay', type: 'number', min: 0, max: 24, unit: 'hours', required: true, usedBy: ['current_model'] },
  { id: 'alcoholFrequency', type: 'enum', values: ENUMS.frequency, required: true, usedBy: ['current_model'] },
  { id: 'transport', type: 'enum', values: ENUMS.transport, required: true, usedBy: ['current_model'] },
]);

const DISCLAIMER =
  'This is a screening estimate from an AI model, not a medical diagnosis. ' +
  'Talk to your GP about any health concerns.';

// ---------------------------------------------------------------------------
// Screen state mapping
// ---------------------------------------------------------------------------

/**
 * Turn any client result into one screen state with plain-language copy.
 * Both web and mobile use this so the same response always looks the same.
 *
 * @param {object} result  what createAiAssessmentClient().predict() resolved
 *                         with: { ok: true, data } or { ok: false, code, ... }
 * @returns {{ state: string, title: string, message: string, retryable: boolean,
 *             prediction: object|null, fieldErrors: object }}
 */
function toScreenState(result) {
  const base = { prediction: null, fieldErrors: {}, retryable: false };

  if (!result || typeof result !== 'object') {
    return { ...base, state: 'error', title: 'Something went wrong', message: 'Please try again.', retryable: true };
  }

  if (result.ok) {
    const prediction = result.data && result.data.prediction;
    if (!prediction) {
      return { ...base, state: 'error', title: 'Something went wrong', message: 'Please try again.', retryable: true };
    }
    if (prediction.status === 'unavailable') {
      return {
        ...base,
        prediction,
        state: 'fallback',
        title: 'AI check unavailable right now',
        message:
          'We could not reach the AI model, so this shows an estimate from your height and weight only. Try again later for the full check.',
        retryable: true,
      };
    }
    if (prediction.uncertain) {
      return {
        ...base,
        prediction,
        state: 'uncertain',
        title: 'Result with low confidence',
        message: 'The AI model is not very sure about this result. Treat it as a rough guide and talk to your GP if you are worried.',
      };
    }
    return { ...base, prediction, state: 'ready', title: 'Your AI health check', message: DISCLAIMER };
  }

  const code = result.code;
  if (code === ERROR_CODES.VALIDATION_ERROR) {
    const fieldErrors = {};
    (result.errors || []).forEach((e) => {
      if (e && e.field && !fieldErrors[e.field]) fieldErrors[e.field] = e.message;
    });
    return {
      ...base,
      fieldErrors,
      state: 'invalid_input',
      title: 'Check your answers',
      message: 'Some answers need fixing before we can run the check.',
    };
  }
  if (AUTH_ERROR_CODES.indexOf(code) !== -1) {
    return { ...base, state: 'needs_login', title: 'Please sign in again', message: 'Your session has ended. Sign in and your answers will still be here.' };
  }
  if (code === ERROR_CODES.RATE_LIMITED) {
    return { ...base, state: 'rate_limited', title: 'Too many checks', message: 'You have run several checks recently. Please try again in 15 minutes.' };
  }
  if (code === ERROR_CODES.CONTRACT_VERSION_UNSUPPORTED) {
    return { ...base, state: 'error', title: 'Update needed', message: 'This version of the app is out of date. Please update NutriHelp to continue.' };
  }
  if (code === ERROR_CODES.NETWORK_ERROR || code === ERROR_CODES.CLIENT_TIMEOUT) {
    return { ...base, state: 'error', title: 'No connection', message: 'Check your internet connection and try again.', retryable: true };
  }
  return { ...base, state: 'error', title: 'Something went wrong', message: 'We could not run the check. Please try again.', retryable: true };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const DEFAULT_CLIENT_TIMEOUT_MS = 15000;

/* Loaded lazily so the client bundle does not carry fixtures unless mock mode is used. */
function loadFixture(name) {
  switch (name) {
  case 'ready': return require('./fixtures/predict-success-ai.json');
  case 'uncertain': return require('./fixtures/predict-success-uncertain.json');
  case 'fallback': return require('./fixtures/predict-fallback.json');
  case 'invalid_input': return require('./fixtures/error-validation.json');
  case 'needs_login': return require('./fixtures/error-unauthorised.json');
  case 'rate_limited': return require('./fixtures/error-rate-limited.json');
  default: return null;
  }
}

function normaliseBody(status, body) {
  if (!body || typeof body !== 'object' || typeof body.success !== 'boolean') {
    return { ok: false, status, code: ERROR_CODES.BAD_RESPONSE, message: 'Unexpected response from the server.' };
  }
  if (body.success) return { ok: true, status, data: body.data, meta: body.meta || {} };
  return {
    ok: false,
    status,
    code: body.code || ERROR_CODES.INTERNAL_ERROR,
    message: typeof body.error === 'string' ? body.error : 'Request failed.',
    errors: Array.isArray(body.errors) ? body.errors : [],
  };
}

/**
 * Create a client for the AI assessment endpoints.
 *
 * @param {object}   options
 * @param {string}   options.baseUrl          API origin, e.g. https://api.nutrihelp.example
 * @param {Function} [options.getAccessToken] returns the user's JWT (sync or async)
 * @param {Function} [options.fetch]          fetch implementation (defaults to global fetch)
 * @param {number}   [options.timeoutMs]      request timeout, default 15000
 * @param {string}   [options.mock]           a screen state name ('ready', 'uncertain',
 *                                            'fallback', 'invalid_input', 'needs_login',
 *                                            'rate_limited', 'error') to return a fixture
 *                                            instead of calling the API
 * @param {number}   [options.mockDelayMs]    simulated latency in mock mode, default 800
 */
function createAiAssessmentClient(options) {
  const opts = options || {};
  const baseUrl = String(opts.baseUrl || '').replace(/\/$/, '');
  const fetchImpl = opts.fetch || (typeof fetch === 'function' ? fetch : null);
  const timeoutMs = opts.timeoutMs || DEFAULT_CLIENT_TIMEOUT_MS;

  async function request(path, init) {
    if (!fetchImpl) {
      return { ok: false, status: 0, code: ERROR_CODES.NETWORK_ERROR, message: 'fetch is not available.' };
    }
    const headers = { Accept: 'application/json', 'X-Contract-Version': CONTRACT_VERSION };
    if (init && init.body) headers['Content-Type'] = 'application/json';
    const token = opts.getAccessToken ? await opts.getAccessToken() : null;
    if (token) headers.Authorization = `Bearer ${String(token).replace(/^Bearer\s+/i, '')}`;

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (controller) controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller ? controller.signal : undefined,
      });
      let body = null;
      try {
        body = await response.json();
      } catch (_e) {
        body = null;
      }
      return normaliseBody(response.status, body);
    } catch (_error) {
      return timedOut
        ? { ok: false, status: 0, code: ERROR_CODES.CLIENT_TIMEOUT, message: 'The request took too long.' }
        : { ok: false, status: 0, code: ERROR_CODES.NETWORK_ERROR, message: 'Could not reach the server.' };
    } finally {
      clearTimeout(timer);
    }
  }

  async function mockResponse() {
    await new Promise((resolve) => setTimeout(resolve, opts.mockDelayMs == null ? 800 : opts.mockDelayMs));
    if (opts.mock === 'error') {
      return { ok: false, status: 0, code: ERROR_CODES.NETWORK_ERROR, message: 'Could not reach the server.' };
    }
    const fixture = loadFixture(opts.mock);
    if (!fixture) throw new Error(`Unknown mock scenario "${opts.mock}"`);
    return normaliseBody(fixture.httpStatus, fixture.body);
  }

  return {
    /** Fetch the live contract so the app can confirm it speaks the same version. */
    getContract() {
      return request(ENDPOINTS.contract, { method: 'GET' });
    },

    /** Request a prediction. Never throws: always resolves to { ok, ... }. */
    predict(inputs) {
      if (opts.mock) return mockResponse();
      return request(ENDPOINTS.predict, {
        method: 'POST',
        body: JSON.stringify({ contractVersion: CONTRACT_VERSION, inputs }),
      });
    },
  };
}

module.exports = {
  CONTRACT_VERSION,
  SERVICE_NAME,
  ENDPOINTS,
  ENUMS,
  ERROR_CODES,
  AUTH_ERROR_CODES,
  INPUT_FIELDS,
  DISCLAIMER,
  toScreenState,
  createAiAssessmentClient,
};
