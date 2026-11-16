# FE-04: AI Health Assessment

A complete health assessment feature: a guided questionnaire, an explainable scoring engine, NutriHelp AI model cross-check, an LLM-written summary, encrypted history and a 4-week plan, all behind one screen.

## What the user gets

1. **Intro and consent.** Explains the check-in, asks for the "not a diagnosis" consent and whether to save the result. Offers "Start from my last answers" and a link to the last result.
2. **Five-step wizard** (About you, Eating habits, Lifestyle, Activity & history, Your goals) then a **Review** step. Inline validation, progress bar, keyboard and screen-reader friendly. Unsaved answers survive a page refresh (session storage).
3. **Results**
   - Overall wellness score (0 to 100) on a segmented dial. Each segment is one of six domains, sized by its weight and filled by its score.
   - Six domain scores: body composition, nutrition, activity, metabolic health, lifestyle, hydration.
   - BMI on a scale, healthy weight range, waist risk, waist-to-height ratio.
   - Daily targets: energy, protein, water, fibre, activity.
   - Risk flags ordered by severity, and an action plan ordered by impact.
   - Type 2 diabetes screening with the points behind it.
   - AI model check: the NutriHelp model's predictions and whether they agree with the rules engine.
   - Trend against the previous assessment, 4-week plan, print/PDF, history.
4. **History**: score trend chart, best and latest score, open or delete past assessments.

## API

Mounted at `/api/health-assessment`. Documented in `index.yaml` (tag `HealthAssessment`).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/questions` | public | Questionnaire definition that drives the UI |
| POST | `/` | user | Submit answers, returns the full assessment (rate limited, 10 per 15 min) |
| GET | `/history?limit=12` | user | Summaries, trend, stats |
| GET | `/latest` | user | Most recent full assessment or `null` |
| GET | `/:id` | user | One assessment (owner only) |
| POST | `/:id/plan` | user | 4-week plan built from the assessment |
| DELETE | `/:id` | user | Delete one assessment (owner only) |

A full example response is in `sample-assessment-response.json`.

## How the backend fits together

```
routes/healthAssessment.js            auth, rate limit, routing
controller/healthAssessmentController.js   envelope, id checks, error mapping
validators/healthAssessmentValidator.js    Joi schema generated from the questionnaire
services/healthAssessmentService.js        orchestration
services/healthAssessment/
  questionnaire.js     single source of truth for questions (UI, validation, AI mapping)
  scoringEngine.js     pure, deterministic scoring
  aiInsights.js        NutriHelp AI model + LLM narrative, each with fallback
repositories/healthAssessmentRepository.js encrypted persistence, scoped by user
database/migrations/005_create_health_assessments.sql
```

### Scoring method

| Output | Method |
| --- | --- |
| BMI bands | WHO adult classification |
| Waist risk | WHO / NHMRC: men 94 / 102 cm, women 80 / 88 cm |
| Energy | Mifflin-St Jeor resting energy x activity factor (1.2 to 1.725); 500 kcal deficit for weight loss, floor of 1200 / 1500 kcal |
| Protein | 0.8 g/kg, 1.2 g/kg for 65+ or weight loss, 1.6 g/kg for muscle gain; healthy reference weight used when BMI is 30+ |
| Water | 35 ml/kg, 1.5 to 4 L |
| Diabetes risk | Points adapted from AUSDRISK; BMI is used in place of waist when waist is not given, and the result says so |
| Overall score | Weighted mean: body 20%, nutrition 20%, activity 20%, metabolic 15%, lifestyle 15%, hydration 10% |

### Reliability

- **AI model down?** The assessment still completes from the rules engine and the screen says so. The model call has an 8 s timeout.
- **No LLM key or LLM fails?** A deterministic summary is written instead (Groq first, then Gemini, 12 s timeout each).
- **Database down?** The user still gets the result (HTTP 200, `persisted: false`, with a message) instead of losing it.

### Security and privacy

- All endpoints except `/questions` use `authenticateToken`. The user id always comes from the token, never the request body. `npm run check:route-guards` passes.
- Every read and delete is scoped by `user_id`, so ids cannot be guessed to reach another user's data (IDOR).
- Answers and results are stored as AES-256-GCM ciphertext via `encryptionService` (CS-17). Plain columns hold only score, band and risk level. RLS is enabled on the table.
- No question accepts free text, so nothing the user types can reach the LLM prompt (no prompt injection surface). The prompt contains scores only, no identifiers.
- Internal errors are never returned to the client.

## Setup

1. Run `database/migrations/005_create_health_assessments.sql` in the Supabase SQL editor.
2. Make sure `ENCRYPTION_KEY` is set (already required by CS-17).
3. Optional: `GROQ_API_KEY` or `GEMINI_API_KEY` for the AI summary, and `AI_BASE_URL` for the NutriHelp AI model. Optional tuning: `HEALTH_ASSESSMENT_SUBMIT_LIMIT`, `HEALTH_ASSESSMENT_MODEL_TIMEOUT_MS`, `HEALTH_ASSESSMENT_NARRATIVE_TIMEOUT_MS`.

## Frontend integration

Files: `src/api/healthAssessment.js` and `src/pages/HealthAssessment/`. No new dependencies; it uses React and the shared axios client (`src/api/client.js`).

Copy both into the NutriHelp web app and add a route:

```jsx
import HealthAssessment from './pages/HealthAssessment';

<Route path="/health-assessment" element={<HealthAssessment />} />
```

The service sends `Authorization: Bearer <token>` from local or session storage (`accessToken`, `access_token`, `token` or `jwt`). If your app already sets this header in an axios interceptor, nothing else is needed.

## Tests

```
npx mocha test/unit/healthAssessment.test.js test/unit/healthAssessmentRoutes.test.js --exit
```

37 tests covering the questionnaire, validator, every formula, risk and recommendation rules, AI fallback paths, persistence failure, history, ownership (404), auth on every endpoint, and plan generation. They run without a database, AI server or API key, and sit in `test/unit` so they run in the blocking CI job.
