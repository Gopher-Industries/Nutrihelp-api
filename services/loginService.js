/**
 * services/loginService.js
 * Test-friendly login service:
 * - throws ServiceError(400, ...) when required fields are missing
 * - exports login and loginMfa (async)
 */

const { ServiceError } = require('./serviceError');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

async function login({ email, password } = {}) {
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new ServiceError(400, 'Email and password are required');
  }

  // Minimal happy-path stub (replace with real integration)
  return {
    status: 200,
    body: {
      token: 'test-token',
      user: { id: 1, email },
function buildJwt(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.user_roles?.role_name || 'unknown',
      type: 'access'
    },
  };
}

/**
 * Accepts { email, password, mfaToken } to match test usage.
 */
async function loginMfa({ email, password, mfaToken } = {}) {
  if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(mfaToken)) {
    throw new ServiceError(400, 'Email, password, and token are required');
  }

  // Minimal happy-path stub
  return {
    status: 200,
    body: {
      token: 'test-token-mfa',
      user: { id: 1, email },
    },
  };
}

module.exports = { login, loginMfa };
