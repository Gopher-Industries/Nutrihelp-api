# feat(auth): standardize the authentication lifecycle contract

## Summary

Unifies the response/error envelope across every auth endpoint so web and
mobile clients integrate against one contract. Adds the canonical helper,
the error-code catalogue, lifecycle tests, and the contract doc.

## What changed

- New `services/authResponse.js` exports `authOk`, `authFail`,
  `authValidationError`, `authFailFromError`. All auth controllers go
  through it.
- New `services/authErrorCodes.js` exports a frozen `AUTH_ERROR_CODES`
  catalogue and a default HTTP status per code. Codes are stable and
  additive.
- `controller/authController.js` — `refreshToken`, `googleExchange`,
  `logLoginAttempt`, `sendSMSByEmail` now emit the canonical envelope
  instead of raw service payloads or `{ error: <string> }`.
- `controller/loginController.js` — `login`, `loginMfa`, `resendMfa`
  switched from `utils/apiResponse` (string-error shape) to the
  canonical helper. Stray `res.status(429).json({ error })` blocks
  for the brute-force lock and the 4-attempt warning replaced with
  `authFail`. Account-not-found responses now mirror invalid-credentials
  to prevent enumeration.
- `controller/passwordController.js` — `requestReset`, `verifyCode`,
  `resetPassword` wrap the service result through the canonical
  envelope. Privacy-preserving generic message preserved.
- `controller/userPasswordController.js` — `verifyCurrentPassword`,
  `updateUserPassword`, `legacyPasswordHandler` migrated. Per-rule
  error codes now use the canonical `AUTH_*` set
  (`AUTH_CURRENT_PASSWORD_INVALID`, `AUTH_PASSWORD_MISMATCH`,
  `AUTH_PASSWORD_REUSE`, `AUTH_WEAK_PASSWORD`, etc.).
- `test/contractTests/authLifecycle.test.js` — 20 new Jest tests
  locking in the envelope and the change-password flow's controller-
  level shape. The existing `apiContract.test.js` continues to pass
  unchanged.
- `docs/auth-contract.md` — full contract: envelope, codes, every
  endpoint, client integration rules.

## Canonical envelope

```jsonc
// success
{ "success": true,  "data": { ... }, "meta": { "message": "optional" } }

// error
{ "success": false, "error": { "message": "...", "code": "AUTH_...", "details": { ... } } }
```

`details` is omitted in production. Validation failures use the same
shape with code `AUTH_VALIDATION_ERROR` and `details.fields = [{field,
message}]`.

## Backward compatibility

- HTTP status codes are unchanged across all endpoints.
- Endpoint URLs are unchanged.
- Success payload **keys** are unchanged where they existed; the
  envelope around them is the new piece.
- Error responses change shape — clients that branched on
  `response.error` as a string need to read `response.error.message`
  (and ideally `response.error.code`). The contract doc spells this out.

## Tests

- New: 20 cases in `test/contractTests/authLifecycle.test.js` — all
  pass.
- Existing `apiContract.test.js` still passes (20/20).

## Definition of Done

- Existing auth-related routes support the complete login and recovery
  lifecycle. ✅
- Response structures are consistent across auth endpoints. ✅
- Mobile and frontend teams can integrate using the shared auth APIs
  only. ✅
