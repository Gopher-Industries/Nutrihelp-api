# Authentication API Contract

Canonical request/response contract for every endpoint in the authentication
lifecycle. Web and mobile clients integrate against this single contract — no
platform-specific auth API.

## Envelope

All auth endpoints return one of two envelopes.

**Success**

```json
{
  "success": true,
  "data": { ... },
  "meta": { "message": "Optional human-readable note" }
}
```

`data` is always an object (or `null` when there is genuinely nothing to
return). `meta` is omitted when empty.

**Error**

```json
{
  "success": false,
  "error": {
    "message": "Human-readable description.",
    "code": "AUTH_INVALID_CREDENTIALS",
    "details": { "...optional..." }
  }
}
```

`details` is only included outside `NODE_ENV=production`.

Validation failures use the same envelope with the canonical
`AUTH_VALIDATION_ERROR` code and a `details.fields` array of
`{ field, message }` entries.

## Error codes

The full catalogue lives in [`services/authErrorCodes.js`](../services/authErrorCodes.js).
Codes are stable and additive; existing codes do not change semantics.

Highlights:

- `AUTH_VALIDATION_ERROR` — request validation failed (400).
- `AUTH_MISSING_FIELDS` — required fields absent (400).
- `AUTH_INVALID_CREDENTIALS` — email or password wrong (401).
- `AUTH_RATE_LIMITED` — brute-force / throttle hit (429).
- `AUTH_MFA_REQUIRED` / `AUTH_MFA_INVALID` / `AUTH_MFA_DISABLED` /
  `AUTH_MFA_RESEND_FAILED` — MFA flow signals.
- `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` / `AUTH_REFRESH_FAILED` /
  `AUTH_LOGOUT_FAILED` — token lifecycle.
- `AUTH_CURRENT_PASSWORD_INVALID` / `AUTH_PASSWORD_MISMATCH` /
  `AUTH_PASSWORD_REUSE` / `AUTH_WEAK_PASSWORD` — authenticated password
  change.
- `AUTH_RESET_CODE_INVALID` / `AUTH_RESET_TOKEN_INVALID` / `AUTH_RESET_FAILED`
  — forgot/reset flow.
- `AUTH_OAUTH_EXCHANGE_FAILED` — OAuth (e.g. Google) exchange.
- `AUTH_INTERNAL_ERROR` — unhandled server failure (500).

## Endpoints

### Login lifecycle

| Method | Path                   | Purpose                                            |
| ------ | ---------------------- | -------------------------------------------------- |
| POST   | `/api/auth/login`      | Email + password login (modern path).              |
| POST   | `/api/login`           | Legacy login path. Same envelope; same codes.      |
| POST   | `/api/login/mfa`       | Verify the MFA token issued by `/login`.           |
| POST   | `/api/login/resend-mfa`| Re-issue the MFA token.                            |

`POST /api/login` and `POST /api/login/mfa` `data` shape on success:

```json
{
  "user":    { "user_id": "...", "email": "...", "..." : "..." },
  "session": { "accessToken": "...", "tokenType": "Bearer" }
}
```

When the account has MFA enabled, `POST /api/login` returns HTTP 202 with:

```json
{
  "success": true,
  "data":    { "mfaRequired": true, "mfaChannel": "email" },
  "meta":    { "message": "An MFA token has been sent to your email address.",
               "nextStep": "POST /api/login/mfa" }
}
```

### Token lifecycle

| Method | Path                | Purpose                              |
| ------ | ------------------- | ------------------------------------ |
| POST   | `/api/auth/refresh` | Exchange a refresh token for a new access token. |
| POST   | `/api/auth/logout`  | Revoke a single refresh token.       |
| POST   | `/api/auth/logout-all` | Revoke every refresh token for the authenticated user. |

`POST /api/auth/refresh` `data` shape on success: `{ "session": { ... } }`.

### Password recovery (unauthenticated)

| Method | Path                          | Purpose                                |
| ------ | ----------------------------- | -------------------------------------- |
| POST   | `/api/password/request-reset` | Email a verification code.             |
| POST   | `/api/password/verify-code`   | Exchange the code for a reset token.   |
| POST   | `/api/password/reset`         | Submit the reset token + new password. |

To avoid account enumeration, `request-reset` always returns
`{ success: true, data: null, meta: { message: "If that email exists, a verification code was sent." } }`
even for unknown emails.

### Password change (authenticated)

| Method | Path                       | Purpose                                |
| ------ | -------------------------- | -------------------------------------- |
| POST   | `/api/userpassword/verify` | Re-verify the current password.        |
| PUT    | `/api/userpassword/update` | Change the password (revokes sessions).|
| PUT    | `/api/userpassword/`       | Legacy path; routes to the above.      |

`update` `data` shape on success:

```json
{
  "requireReauthentication": true,
  "requireMfa": false,
  "reauthenticationFlow": "LOGIN"
}
```

A successful change always revokes every other session and clears the
trusted-device cookie.

## Client integration rules

1. **Branch on `success`.** Never branch only on HTTP status. The envelope's
   `success` is the single boolean discriminator.
2. **Branch on `error.code`.** Free-text `error.message` is for humans and may
   be localised in future. Use the codes in `AUTH_ERROR_CODES` for programmatic
   decisions.
3. **Treat `data` as opaque** beyond the documented keys. The contract is
   additive — new fields may appear; existing fields do not change semantics.
4. **No platform-specific endpoints.** Mobile and web ride the same routes.

## Implementation reference

- Helpers: [`services/authResponse.js`](../services/authResponse.js)
- Error catalogue: [`services/authErrorCodes.js`](../services/authErrorCodes.js)
- Contract tests: [`test/contractTests/authLifecycle.test.js`](../test/contractTests/authLifecycle.test.js)
