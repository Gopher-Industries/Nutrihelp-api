# feat(support): consolidate Contact Us / FAQ / Health Tools surface

## Summary

Consolidates the support-related backend (Contact Us, Feedback, Chatbot, FAQ, Health Tools) behind a single response envelope, ships a working email pipeline for Contact Us, and resolves the blank `/health-faq` and `/health-tools` frontend pages by giving them backend endpoints with seed-data fallbacks so they are never empty.

Closes the support consolidation epic.

## Why

- Contact Us silently saved messages to the DB but never notified anyone — the support inbox never received them and users had no acknowledgement.
- `/health-faq` and `/health-tools` rendered blank because the backend exposed no list endpoints (only `GET /api/health-tools/bmi`).
- Each support controller used a slightly different response shape, making the frontend integration noisy.
- The contact-us validator was permissive (no min lengths, no email normalization).
- `routes/index.js` had two duplicate route registrations (`/api/chatbot` and `/api/upload`).

## What's in this PR

### Live Contact Us email flow
- New `utils/emailService.js` wraps Nodemailer with SMTP env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SUPPORT_EMAIL`, `MAIL_FROM`).
- When SMTP is **not** configured the service falls back to Nodemailer's `jsonTransport` and logs a warning — so dev and CI never crash and tests stay hermetic.
- Each Contact Us submission now triggers two emails in parallel:
  1. Support inbox receives the user's submission (with `Reply-To` set to the user)
  2. User receives an acknowledgement that we got their message
- Email failures are logged but **do not** fail the request — the user's message is already persisted.

### FAQ + Health Tools (no more blank pages)
- New `GET /api/faq` (with optional `?category=`) — reads from the `faq` Supabase table when present, falls back to bundled seed FAQs (`controller/supportData/faqSeed.js`) when the table is missing, empty, or errors.
- New `GET /api/health-tools` — returns the tool catalogue from `controller/supportData/healthToolsSeed.js` so the frontend page always has something to render.
- `GET /api/health-tools/bmi` upgraded with BMI category, water-intake estimate, and input range validation.

### Standardized response envelope
- New `utils/supportResponse.js` — thin helper around `services/apiResponseService` that emits `{ success, data, meta }` for success and `{ success, error: { message, code, details? } }` for errors across all support endpoints.
- Validation errors now surface as a structured `details.fields` array instead of raw express-validator output.

### Tighter validation
- `validators/contactusValidator.js`: min lengths on name/subject/message, email length cap, and `normalizeEmail()`.

### Tests (15 / 15 passing)
- `test/contactus.controller.test.js` — validation envelope, persistence success, persistence failure, email failure degradation
- `test/userFeedback.controller.test.js` — happy path + persistence failure
- `test/faq.controller.test.js` — seed fallback (empty rows / DB error), DB rows when present, category filter
- `test/healthTools.controller.test.js` — catalogue, category filter, BMI invalid input, BMI out-of-range, BMI happy path

### Cleanup
- `routes/index.js`: removed the duplicate `/api/chatbot` and `/api/upload` mounts; grouped the support surface together.
- Dropped the legacy `validateRequest` middleware from `routes/contactus.js` and `routes/userfeedback.js` (the controllers now own validation handling and emit the standardized envelope).

## API surface

| Method | Path | Auth | Notes |
| -----: | ---- | ---- | ----- |
| `POST` | `/api/contactus` | none | Persist + email support + ack user |
| `POST` | `/api/userfeedback` | none | Persist feedback |
| `GET`  | `/api/faq` | none | FAQ list (seed fallback) |
| `GET`  | `/api/faq?category=Support` | none | Filter by category (case-insensitive) |
| `GET`  | `/api/health-tools` | none | Tool catalogue |
| `GET`  | `/api/health-tools/bmi` | none | BMI + water intake |

No existing routes were removed. No breaking changes to existing API consumers — the chatbot, recipe, auth, etc. surfaces are untouched.

## Response envelope examples

Success (`POST /api/contactus`):
```json
{
  "success": true,
  "data": {
    "received": true,
    "email": {
      "supportNotified": true,
      "acknowledgementSent": true,
      "smtpConfigured": true
    }
  },
  "meta": { "message": "Your message has been received. Our team will be in touch soon." }
}
```

Validation error:
```json
{
  "success": false,
  "error": {
    "message": "Invalid request payload",
    "code": "VALIDATION_ERROR",
    "details": {
      "fields": [
        { "field": "email", "message": "Invalid email format" },
        { "field": "message", "message": "Message must be between 10 and 2000 characters" }
      ]
    }
  }
}
```

Server error:
```json
{
  "success": false,
  "error": {
    "message": "We could not save your message. Please try again shortly.",
    "code": "CONTACT_REQUEST_FAILED"
  }
}
```

## Files

**New**
```
utils/emailService.js
utils/supportResponse.js
controller/faqController.js
controller/supportData/faqSeed.js
controller/supportData/healthToolsSeed.js
routes/faq.js
test/contactus.controller.test.js
test/userFeedback.controller.test.js
test/faq.controller.test.js
test/healthTools.controller.test.js
docs/SUPPORT_CONSOLIDATION.md
```

**Modified**
```
controller/contactusController.js
controller/userFeedbackController.js
controller/healthToolsController.js
routes/contactus.js
routes/userfeedback.js
routes/healthTools.js
routes/index.js
validators/contactusValidator.js
.env.example
```

## Configuration

Add the following to `.env` (already documented in `.env.example`):

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey-or-username
SMTP_PASS=secret
SUPPORT_EMAIL=support@nutrihelp.example
MAIL_FROM="NutriHelp Support <support@nutrihelp.example>"
```

If these are left blank, the service falls back to a no-op JSON transport — the Contact Us form will still return `201` and persist the message, but no email will be delivered. `data.email.smtpConfigured: false` is returned in the response envelope so this state is observable.

## How to test locally

```bash
cp .env.example .env
# fill in SMTP_HOST, SMTP_USER, SMTP_PASS, SUPPORT_EMAIL
npm install
npm run dev

# In another shell:
curl -X POST http://localhost:3000/api/contactus \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane","email":"you@example.com","subject":"Hi","message":"This is a test message."}'

curl http://localhost:3000/api/faq
curl http://localhost:3000/api/health-tools
curl 'http://localhost:3000/api/health-tools/bmi?height=1.75&weight=70'
```

Run the new test suites:
```bash
npx jest test/contactus.controller.test.js \
         test/userFeedback.controller.test.js \
         test/faq.controller.test.js \
         test/healthTools.controller.test.js
```

## Risks / rollout

- **Low blast radius.** No existing API contracts were removed; consumers of `POST /api/contactus` will see the success response shape change from `{ success: true, data: null, meta: { message } }` to `{ success: true, data: { received: true, email: {...} }, meta: { message } }`. Frontend should ignore unknown keys, but worth a smoke test.
- **No DB schema changes.** The optional `faq` Supabase table is read-only; if it doesn't exist the controller falls back to the bundled seed.
- **Email is best-effort.** Transient SMTP failures will not 5xx the request; they are logged at `warn` level and surfaced as `data.email.supportNotified: false`. Add an alert on that signal if you want hard guarantees.
- **Backwards-compatible validation.** The validator is stricter (min lengths) — frontend forms with very short subjects/messages may now see 400s. The frontend's existing required-field checks should already cover these.

## Definition of Done — checklist

- [x] Contact Us form is fully functional with email sending and acknowledgement
- [x] FAQ and health tools pages have backing endpoints (no blank states)
- [x] Support-related APIs use a consistent envelope
- [x] No unnecessary new API surface introduced
- [x] Fallback responses exist when data is unavailable
- [x] Standardized response and error handling
- [x] Tests added/updated for contact, feedback, FAQ flows (15 / 15 green)
