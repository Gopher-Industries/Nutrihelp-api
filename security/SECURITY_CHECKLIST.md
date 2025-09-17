# Nutrihelp-api Security Checklist (Project Customized)

Version: 1.0
Generated: 2025-09-14

Overview: This checklist is based on the current repository implementation (Express.js, JWT, helmet, CORS, express-rate-limit, file uploads, public `uploads` exposure, dependency list, etc.). Each item includes: purpose/risk, files/locations to check, automated detection suggestions, pass criteria, evidence to collect, remediation suggestions, and priority.

---

## Overall security context (observed from code)
- Framework: Express.js (`server.js` is the entry point).
- Authentication: JWT (middleware authenticates tokens, using `process.env.JWT_TOKEN` as the key in some places).
- Authorization: role-based `authorizeRoles` middleware using the `role` field inside the token.
- Security headers: `helmet` is applied with a CSP that allows `'unsafe-inline'` and `https://cdn.jsdelivr.net` for scripts/styles.
- CORS: restricted to `FRONTEND_ORIGIN` (set to `http://localhost:3000` in development), credentials allowed.
- Rate limiting: global limiter and specialized login/signup/form limiters are used.
- File uploads: an `uploads` folder is exposed as static; a `uploads/temp` temporary folder and cleanup logic exist.
- Dependencies: `package.json` contains common third-party libraries (`jsonwebtoken`, `bcryptjs`, `helmet`, `express-rate-limit`, `multer`, `mysql2`, etc.).

---

### 1. JWT secret & session management (Critical)
- Purpose / Risk: If the JWT secret is weak or leaked, attackers can forge tokens and escalate privileges. Long-lived tokens or lack of revocation increases impact.
- Files / Locations: `middleware/authenticateToken.js`, `.env` (JWT_TOKEN), all uses of `jsonwebtoken`.
- Automated checks:
  - Static: flag `.env` committed to repo; detect `process.env.JWT_TOKEN` usage and hard-coded secrets.
  - Runtime: check token expiry (`exp`) when signing; detect absence of revocation or refresh strategy.
- Pass criteria: random/strong secret stored in env or KMS, short expiry (<= 24h recommended), refresh/revocation strategy in place.
- Fail criteria: hard-coded secret, `.env` with example secret committed, tokens without expiry, no revocation.
- Evidence: code snippets showing sign/verify, `.env` contents if present, semgrep findings.
- Remediation: rotate secret, use KMS/Vault, set reasonable `exp`, implement token revocation/rotation.

---

### 2. Authentication & Authorization (Broken Access Control) (Critical)
- Purpose / Risk: Ensure `authorizeRoles` is applied to protected routes and tokens are not forgeable.
- Files / Locations: `middleware/authorizeRoles.js`, route definitions under `routes/`.
- Automated checks:
  - Static: scan for sensitive routes missing `authenticateToken` or `authorizeRoles`.
  - Dynamic: run integration tests that call protected endpoints with different roles and assert access control.
- Remediation: add middleware to all sensitive endpoints and include role-based integration tests in CI.

---

### 3. File uploads and public exposure (High)
- Purpose / Risk: Publicly exposing `uploads` risks hosting user-uploaded scripts or sensitive files.
- Files / Locations: `server.js` (static `uploads`), upload routes, multer usage.
- Automated checks:
  - Static: flag `express.static('uploads')` usage and check upload handlers for MIME and extension validation.
  - Dynamic: upload test files (html/js/php/svg) and verify access/behavior.
- Remediation: enforce whitelist file types, content-based validation, randomize filenames, serve as attachments, disable execution at web server level.

---

### 4. CORS & CSRF (Medium)
- Purpose / Risk: Avoid overly permissive CORS in production (no `*` or localhost in prod).
- Files / Locations: `server.js` (CORS config).
- Automated checks: detect `localhost` or `*` in production CORS settings.
- Remediation: use env-driven origin, enable CSRF protection for cookie-based auth.

---

### 5. Security headers & CSP (Medium)
- Purpose / Risk: CSP containing `unsafe-inline` weakens XSS protections.
- Files / Locations: `server.js` (helmet/csp config).
- Automated checks: flag `unsafe-inline` or `unsafe-eval` in CSP.
- Remediation: use nonces/hashes, move inline scripts to external files, consider SRI for CDN assets.

---

### 6. Dependencies & supply chain (Critical)
- Purpose / Risk: Outdated or vulnerable packages pose high risk.
- Files / Locations: `package.json`, `package-lock.json`, `.github/workflows`.
- Automated checks: run `npm audit`, `dependabot`, integrate `snyk` or `trivy` in CI.
- Remediation: upgrade, patch, or mitigate vulnerable packages; add automated dependency scans.

---

### 7. Rate limiting & brute-force (High)
- Purpose / Risk: Ensure login and sensitive endpoints have strict rate limits.
- Files / Locations: `middleware/rateLimiter.js`, login/signup routes.
- Automated checks: test login throttling, check dedicated limiters on sensitive endpoints.
- Remediation: add per-account stricter rate limiting and alerting.

---

### 8. Error handling & information leakage (Medium)
- Purpose / Risk: Avoid returning stack traces or sensitive info in production responses.
- Files / Locations: global error handlers in `server.js`.
- Automated checks: trigger errors and inspect responses.
- Remediation: return generic messages in production; log details to internal logs only.

---

### 9. Logging & monitoring (High)
- Purpose / Risk: Capture failed logins, privilege changes, and anomalies.
- Files / Locations: `Monitor_&_Logging/`, `server.js`.
- Automated checks: ensure critical events are logged and forwarded to central system.
- Remediation: integrate ELK/CloudWatch and alerting.

---

### 10. Static code security rules (Medium)
- Purpose / Risk: Prevent common issues via static checks (hard-coded creds, eval, SQL concat).
- Files / Locations: whole repository.
- Automated checks: semgrep/ESLint rules for security patterns.
- Remediation: add these rules to PR checks.

---

## Recommended automation priorities & integration points
- PR time: semgrep, dependency scanning, `.env` commit check, basic lint.
- Merge/Release: container scanning, DAST baseline (ZAP), authorization tests.
- Nightly/Weekly: full DAST, fuzzing, re-scan dependencies.

---

## Suggested JSON output schema (simplified)
- id: string
- title: string
- severity: Critical|High|Medium|Low
- status: pass|fail|info
- evidence: []
- file: string|null
- remediation: string
