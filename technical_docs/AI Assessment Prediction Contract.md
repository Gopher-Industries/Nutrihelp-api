# AI Assessment Prediction Contract (v1)

**Ticket:** FE-06, agree with backend how the AI model API connects to the assessment screen
**Status:** Proposed. Needs sign-off from backend, the AI model owner and cyber before it is treated as agreed (see [Sign-off](#sign-off)).
**Contract version:** `v1`
**Endpoints:** `GET /api/ai-assessment/contract`, `POST /api/ai-assessment/predict`

The assessment screen (web and the Expo mobile app) gets AI model predictions
through **one backend endpoint with one stable response shape**. The screen
never calls the AI service directly and never sees model feature codes. The
backend maps plain inputs to the model, normalises whatever the model returns,
and always answers in this contract, even when the model is down.

```
Assessment screen (web / Expo)
   │  POST /api/ai-assessment/predict   { contractVersion, inputs }   JWT
   ▼
routes/aiAssessment.js        auth, per-user rate limit
controller/aiAssessmentController.js   version check, validation, envelope
services/aiAssessment/gateway.js       circuit breaker, timeout, metrics
   ├─ featureMapper.js   plain inputs → model features (only place that knows them)
   ├─ MedicalPredictionService → AI service  {AI_BASE_URL}/retrieve
   └─ normaliser.js      model output → contract `prediction`
   ▼
{ success, data: { prediction, model, explainability, disclaimer }, meta }
```

## Why this contract is needed: how it works today

The FE-06 audit of the codebase found these gaps between the AI model and the screen:

| # | Finding | Effect on the screen | Fixed by this contract |
|---|---|---|---|
| 1 | Two AI paths exist. The live one is `medicalPredictionService` calling `{AI_BASE_URL}/retrieve`. The `ai/` adapter layer calls `/ai-model/medical-prediction/{risk,obesity,diabetes}` on `AI_SERVER_BASE_URL`, which are not served, and the adapter is not used anywhere. | Unclear which one the screen should rely on. | Gateway uses the live path only. Adapter left untouched for the backend team to decide. |
| 2 | `POST /api/medical-report/retrieve` and `/plan` have no authentication (listed in `scripts/route-guard-baseline.json`). | The screen should not send health data to an open endpoint. | New endpoint requires `authenticateToken` and is rate limited. |
| 3 | When the AI call fails, `medicalPredictionService` silently returns a BMI estimate with a fixed confidence of 0.78. | The screen labels a rule-of-thumb as "AI". | `prediction.source` and `explainability.fallbackUsed` always say which it was. |
| 4 | Confidence arrives as 0-1 (`0.798`) or 0-100 (`79.8`); `diabetes` arrives as a boolean or a sentence; `medical_report` is an object or an array. | Every client must handle every variant. | Normaliser returns one shape: 0-1 numbers, `true`/`false`/`null`. |
| 5 | `fetch` calls set a `timeout` option that native `fetch` ignores. | A hung model hangs the screen. | Hard timeout (8 s default) with `AbortSignal`, plus a circuit breaker. |
| 6 | No model version in responses. | Nobody can tell when the model changed. | `model.version`, read from the model when it sends one. |
| 7 | `index.yaml` documents `CAEC`/`CALC` as integers in one place and strings in another, and `Gender` as `Male` while the code sends `1`. | Request encoding is ambiguous. | Encoding lives in `featureMapper.js` only; open question Q3 below. |

## Request

```
POST /api/ai-assessment/predict
Authorization: Bearer <access token>
Content-Type: application/json
X-Contract-Version: v1            (optional; the body field wins)
```

```jsonc
{
  "contractVersion": "v1",         // optional, defaults to v1
  "inputs": {
    "sex": "male",                 // female | male
    "ageYears": 45,                // integer 16-100
    "heightCm": 178,               // 120-230
    "weightKg": 92,                // 30-300
    "waistCm": 101,                // optional, 40-200
    "familyHistoryOverweight": true,
    "familyHistoryDiabetes": true,         // optional
    "highBloodGlucoseHistory": false,      // optional
    "bloodPressureMedication": false,      // optional
    "smoker": false,
    "vegetableFrequency": "sometimes",     // rarely | sometimes | always
    "mainMealsPerDay": 3,                  // 1-4, 4 = more than three
    "snackingFrequency": "frequently",     // never | sometimes | frequently | always
    "highCalorieFoods": true,
    "waterLitresPerDay": 1.5,              // 0-10
    "monitorsCalories": false,
    "activityDaysPerWeek": 2,              // 0-7
    "screenTimeHoursPerDay": 4,            // 0-24
    "alcoholFrequency": "frequently",      // never | sometimes | frequently | always
    "transport": "car"                     // car | public_transport | motorbike | bicycle | walking
  }
}
```

Rules:
- Values are sent in plain units. The screen never sends model codes such as `FAVC` or `CAEC`.
- Types are strict: `"45"` is rejected for `ageYears`. Unknown fields are rejected, so typos surface during development.
- The user id is taken from the token, never from the body, and is never sent to the AI model.
- The full field list, with ranges and which model needs each one, is `INPUT_FIELDS` in `contracts/ai-assessment/v1/index.js` and is served live by `GET /api/ai-assessment/contract`.

## Success response (`200`)

```jsonc
{
  "success": true,
  "data": {
    "prediction": {
      "status": "available",            // available | unavailable
      "source": "ai_model",             // ai_model | fallback_estimate
      "uncertain": false,               // true when any confidence < threshold, or on fallback
      "bmi": 29.0,                      // always computed by the backend from height and weight
      "weightCategory": {
        "code": "overweight",           // underweight | healthy | overweight | obese_1 | obese_2 | obese_3
        "label": "Overweight",
        "modelLabel": "Overweight_Level_II",  // raw model class, null on fallback
        "confidence": 0.84,             // 0-1 or null
        "agreesWithBmi": true           // null on fallback
      },
      "diabetes": {                     // null when the model gave nothing usable, and always on fallback
        "positive": true,               // true | false | null when unreadable
        "riskLevel": null,              // low | moderate | high, only when a probability exists
        "probability": null,            // 0-1 or null
        "confidence": 0.78              // 0-1 or null
      }
    },
    "model": { "name": "nutrihelp-medical-report", "version": "unversioned" },  // null on fallback
    "explainability": {
      "service": "assessment_prediction",
      "source": "ai_model",
      "fallbackUsed": false,
      "timedOut": false,
      "circuitOpen": false,
      "durationMs": 412,
      "confidenceThreshold": 0.6,
      "warnings": ["probability_unavailable"],
      "generatedAt": "2026-11-19T05:30:00.000Z",
      "contractVersion": "v1"
    },
    "disclaimer": "This is a screening estimate from an AI model, not a medical diagnosis. ..."
  },
  "meta": { "contractVersion": "v1" }
}
```

The backend never invents a diabetes result. When the model is unavailable the
response still returns `200`, with `status: "unavailable"`, a BMI-only weight
category and `diabetes: null`.

### Warnings

| Warning | Meaning |
|---|---|
| `model_timeout` | The model did not answer within `AI_ASSESSMENT_MODEL_TIMEOUT_MS` (8000 ms). |
| `model_unreachable` | Connection or HTTP error from the AI service. |
| `model_bad_response` | The model answered without a usable report. |
| `circuit_open` | Five failures in a row; the model is skipped for 60 s. |
| `low_confidence` | A confidence is below `AI_ASSESSMENT_CONFIDENCE_THRESHOLD` (0.6). |
| `probability_unavailable` | The model gave a yes/no but no probability, so `riskLevel` is `null`. |
| `diabetes_prediction_missing` | No readable diabetes block. |
| `weight_prediction_missing` | No model weight class; the BMI band is shown instead. |
| `model_disagrees_with_bmi` | The model's weight class differs from the BMI band. |

## Rendering rules for the screen

Both apps call `toScreenState(result)` from the shared contract package, so the
same response always produces the same state and wording.

| Screen state | When | What the screen shows |
|---|---|---|
| `ready` | `prediction.status = available`, not uncertain | The result and the disclaimer. |
| `uncertain` | Available but `uncertain = true` | The result marked as a rough guide. |
| `fallback` | `prediction.status = unavailable` | BMI only, "AI check unavailable right now", a retry button. |
| `invalid_input` | `VALIDATION_ERROR` | `fieldErrors[field]` next to each answer. |
| `needs_login` | Any `TOKEN_*` / auth code | Ask the user to sign in again; keep their answers. |
| `rate_limited` | `AI_ASSESSMENT_RATE_LIMITED` | "Try again in 15 minutes." |
| `error` | Network, timeout, version mismatch, anything else | A plain message, with a retry button where it can help. |

## Errors

| `code` | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Missing, wrong-type, out-of-range or unknown field. Has `errors[]` of `{ field, message }`. |
| `CONTRACT_VERSION_UNSUPPORTED` | 400 | The client asked for a version the server does not support. |
| `TOKEN_MISSING`, `TOKEN_INVALID`, `INVALID_AUTH_HEADER`, `INVALID_TOKEN`, `INVALID_TOKEN_TYPE` | 401 | From the shared auth middleware. |
| `AI_ASSESSMENT_RATE_LIMITED` | 429 | More than 20 predictions in 15 minutes for one user (`AI_ASSESSMENT_RATE_LIMIT`). |
| `INTERNAL_ERROR` | 500 | Unexpected server error. No internal detail is returned. |

The client adds three codes it can raise itself: `NETWORK_ERROR`, `CLIENT_TIMEOUT` (15 s) and `BAD_RESPONSE`.

## Versioning

- Adding an optional input field, a new warning or a new optional response field is **not** breaking: it stays `v1`.
- Removing or renaming a field, changing a type or unit, or adding a required input **is** breaking: it becomes `v2`, served side by side with `v1` until both apps have shipped.
- Clients send `contractVersion`; the server rejects versions it does not support with `CONTRACT_VERSION_UNSUPPORTED`, which the app shows as "Update needed".
- A new model behind the same contract is not a contract change. It shows up as a new `model.version`.

## Shared contract package

`contracts/ai-assessment/v1/` is used unchanged by the backend, the web screen and the Expo app. It has no dependencies, so Metro bundles it as-is.

| File | Purpose |
|---|---|
| `index.js` | Version, input fields, enums, error codes, `toScreenState()`, `createAiAssessmentClient()` |
| `fixtures/request-valid.json` | A valid request |
| `fixtures/predict-success-ai.json` | `ready` |
| `fixtures/predict-success-uncertain.json` | `uncertain` |
| `fixtures/predict-fallback.json` | `fallback` |
| `fixtures/error-validation.json`, `error-unauthorised.json`, `error-rate-limited.json` | Error states |

Every fixture is validated against the backend's response schema in CI, so the
mobile team can build all screen states with mock data today and trust they
match the live API.

### Using it in the Expo app

```js
import { createAiAssessmentClient, toScreenState } from '../contracts/ai-assessment/v1';
import * as SecureStore from 'expo-secure-store';

const client = createAiAssessmentClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL,
  getAccessToken: () => SecureStore.getItemAsync('accessToken'),
  mock: process.env.EXPO_PUBLIC_AI_MOCK || undefined, // 'ready' | 'uncertain' | 'fallback' | ...
});

const result = await client.predict(answers);   // never throws
const screen = toScreenState(result);            // { state, title, message, prediction, fieldErrors, retryable }
```

Set `EXPO_PUBLIC_AI_MOCK=fallback` (or any screen state) to see each state without the backend. The SecureStore key is an example; use whatever key the app already stores the token under.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `AI_BASE_URL` | `http://localhost:8000/ai-model/medical-report` | AI service (existing) |
| `AI_ASSESSMENT_MODEL_TIMEOUT_MS` | `8000` | Hard timeout for one model call |
| `AI_ASSESSMENT_CONFIDENCE_THRESHOLD` | `0.6` | Below this a result is `uncertain` |
| `AI_ASSESSMENT_DIABETES_RISK_THRESHOLDS` | `0.3,0.6` | Probability cut-offs for moderate and high. Placeholder (Q1). |
| `AI_ASSESSMENT_RATE_LIMIT` | `20` | Predictions per user per 15 minutes |

No database changes, migrations or new secrets are needed.

## Open questions

| # | For | Question | Proposed answer |
|---|---|---|---|
| Q1 | AI model owner (Type 2 Diabetes model) | What does the T2D model return: a probability, a class, a confidence? Which cut-offs mean low, moderate and high risk? | Return `probability` (0-1). Cut-offs are config, so no code change is needed once agreed. Until then `riskLevel` stays `null` unless a probability is sent. |
| Q2 | AI model owner | Which inputs does the T2D model need? Waist, family history of diabetes, glucose history and BP medication are in the contract as optional for this reason. | Add any new input as optional (non-breaking); make it required in `v2` only if needed. |
| Q3 | AI model owner | Exact encoding the service expects for `Gender`, `CAEC`, `CALC` (string or integer)? The docs and code disagree. | Keep today's live encoding; change only `featureMapper.js` once confirmed. |
| Q4 | AI model owner | Can the service return `model_version` (and `model_name`)? | Yes, at the top level of the response. The normaliser already reads it. |
| Q5 | Backend | Should the unauthenticated `/api/medical-report/retrieve` and `/plan` be protected or retired once the screen uses this endpoint? | Yes, protect them; they are already in the route-guard baseline. |
| Q6 | Backend | Keep or remove the unused `ai/` adapter layer and its non-existent `/medical-prediction/*` paths? | Decide separately; this contract does not depend on it. |
| Q7 | Cyber | Health inputs are sent to the AI service in plain JSON over `AI_BASE_URL`. Is HTTPS and service-to-service auth required in production? Nothing is stored by this endpoint. | Yes, HTTPS plus a service token, as a backend follow-up. |
| Q8 | Mobile | Are 15 s for the client timeout and 8 s for the model right on mobile networks? | Start with these; tune from `explainability.durationMs`. |

## Sign-off

| Role | Name | Agreed | Date |
|---|---|---|---|
| Backend lead | | ☐ | |
| AI model owner (Type 2 Diabetes model) | | ☐ | |
| Cyber | | ☐ | |
| Mobile / frontend | | ☐ | |

## Where this is implemented

- `contracts/ai-assessment/v1/` — shared contract package and fixtures
- `routes/aiAssessment.js` — routes, auth, rate limit
- `controller/aiAssessmentController.js` — version check, validation, envelope
- `services/aiAssessment/schemas.js` — Joi request and response schemas (executable contract)
- `services/aiAssessment/featureMapper.js` — inputs to model features
- `services/aiAssessment/normaliser.js` — model output to contract
- `services/aiAssessment/gateway.js` — timeout, circuit breaker, fallback, metrics
- `test/unit/aiAssessmentContract.test.js`, `aiAssessmentGateway.test.js`, `aiAssessmentRoutes.test.js` — 46 tests
- `index.yaml` — OpenAPI paths and schemas under the `AIAssessment` tag
