/**
 * services/signupService.js
 * Minimal signup service that enforces password rules expected by tests.
 */
const { ServiceError } = require('./serviceError');

function isStrongPassword(pw = '') {
  // At least 8 chars, upper, lower, digit, special
  return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])/.test(pw);
}

async function signup({ email, password } = {}) {
  if (!email || !password) {
    throw new ServiceError(400, 'Email and password are required');
  }

  if (!isStrongPassword(password)) {
    throw new ServiceError(
      400,
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      { code: 'WEAK_PASSWORD' }
    );
  }

  // Minimal happy-path stub (replace with real DB creation)
  return {
    status: 201,
    body: {
      id: 1,
      email,
    },
  };
}

module.exports = { signup };
