# Support Surface Consolidation

Branch: `feat/support-consolidation`

This change consolidates the support-related backend (Contact Us, Feedback,
Chatbot, FAQ, Health Tools) behind a single response envelope and ships a
working email pipeline for Contact Us. It also resolves the blank
`/health-faq` and `/health-tools` frontend pages by giving them backend
endpoints with a seed-data fallback so they are never empty.

## What changed

### New
- `utils/emailService.js` — Nodemailer wrapper used by support flows. Falls
  back to a no-op JSON transport when SMTP env vars are unset so dev and CI
  remain safe.
- `utils/supportResponse.js` — small helper around the existing
  `services/apiResponseService` that emits a consistent
  `{ success, data, meta }` / `{ success, error }` envelope across the
  support surface.
- `controller/faqController.js`, `routes/faq.js`,
  `controller/supportData/faqSeed.js` — `GET /api/faq` (with optional
  `?category=`). Reads from the `faq` Supabase table when present, falls
  back to bundled seed FAQs otherwise.
- `controller/supportData/healthToolsSeed.js` — catalogue of available
  health tools (kept under `controller/` because the repo's `/data` path
  is gitignored).
- Tests:
  `test/contactus.controller.test.js`,
  `test/userFeedback.controller.test.js`,
  `test/faq.controller.test.js`,
  `test/healthTools.controller.test.js`.

### Updated
- `controller/contactusController.js` — persists submission then emails the
  support inbox and an acknowledgement to the user in parallel; email
  failures log a warning but do not fail the request.
- `controller/userFeedbackController.js` — refactored to use the
  standardized envelope.
- `controller/healthToolsController.js` — adds `listTools` (catalogue) and
  enriches BMI with category + range validation, all using the standardized
  envelope.
- `routes/healthTools.js` — registers `GET /api/health-tools` (catalogue)
  alongside `GET /api/health-tools/bmi`.
- `routes/contactus.js`, `routes/userfeedback.js` — drop the legacy
  `validateRequest` middleware (controllers now emit the standardized
  validation envelope themselves).
- `routes/index.js` — wires `/api/faq`, dedupes the duplicate `/api/chatbot`
  and `/api/upload` mounts, and groups the support surface together.
- `validators/contactusValidator.js` — adds min lengths, email
  normalization, and an upper bound on email length.
- `.env.example` — adds `SMTP_*`, `SUPPORT_EMAIL`, `MAIL_FROM`.

## API surface

| Method | Path                          | Notes                              |
| -----: | ----------------------------- | ---------------------------------- |
| POST   | `/api/contactus`              | Persist + email support + ack user |
| POST   | `/api/userfeedback`           | Persist feedback                   |
| GET    | `/api/faq`                    | FAQs (seed fallback)               |
| GET    | `/api/faq?category=Support`   | Filter by category (case-insens.)  |
| GET    | `/api/health-tools`           | Tool catalogue                     |
| GET    | `/api/health-tools/bmi`       | BMI + water intake                 |
| POST   | `/api/chatbot/query`          | Existing — unchanged               |

No existing routes were removed. The `validateRequest` middleware is still
in place for other routes that depend on it.

## Response envelope

Success:

```json
{ "success": true, "data": { ... }, "meta": { ... } }
```

Validation error:

```json
{
  "success": false,
  "error": {
    "message": "Invalid request payload",
    "code": "VALIDATION_ERROR",
    "details": { "fields": [{ "field": "email", "message": "Invalid email format" }] }
  }
}
```

Server error:

```json
{ "success": false, "error": { "message": "...", "code": "..." } }
```

## Email behaviour

`utils/emailService.js`:
- If `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` are configured, sends real
  email via Nodemailer SMTP.
- Otherwise uses Nodemailer's `jsonTransport` and logs a warning. The
  request still succeeds — `data.email.smtpConfigured: false` is returned
  so the client can surface this in dev tooling if useful.
- Each Contact Us submission triggers two emails:
  1. `support@…` ← user's submission (with Reply-To set to the user)
  2. user@… ← acknowledgement that we received their message

## Running locally

```bash
cp .env.example .env
# Fill in SMTP_HOST, SMTP_USER, SMTP_PASS, SUPPORT_EMAIL
npm install
npm run dev
```

## Tests

```bash
npx jest test/contactus.controller.test.js \
        test/userFeedback.controller.test.js \
        test/faq.controller.test.js \
        test/healthTools.controller.test.js
```

All 15 tests in this surface pass.
