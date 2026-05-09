/**
 * Auth Lifecycle Contract Tests
 *
 * Locks in the canonical envelope produced by services/authResponse.js so
 * frontend and mobile clients can integrate against a single, stable shape:
 *
 *   Success: { success: true,  data: <object|null>, meta?: { message?, ... } }
 *   Error:   { success: false, error: { message, code, details? } }
 *
 * These tests do NOT load server.js to avoid open-handle issues and to keep
 * the contract tests fast. They validate the helpers and the shape produced
 * by each auth controller exit path that goes through them.
 */

const {
  authOk,
  authFail,
  authValidationError,
  authFailFromError,
  AUTH_ERROR_CODES,
} = require('../../services/authResponse');
const { ServiceError } = require('../../services/serviceError');
const { statusForAuthCode } = require('../../services/authErrorCodes');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function lastBody(res) {
  return res.json.mock.calls[0][0];
}

function lastStatus(res) {
  return res.status.mock.calls[0][0];
}

describe('authResponse.authOk()', () => {
  it('emits { success: true, data } at status 200 by default', () => {
    const res = mockRes();
    authOk(res, { user: { id: 1 } });
    expect(lastStatus(res)).toBe(200);
    expect(lastBody(res)).toMatchObject({
      success: true,
      data: { user: { id: 1 } },
    });
  });

  it('honours custom status', () => {
    const res = mockRes();
    authOk(res, { mfaRequired: true }, { status: 202 });
    expect(lastStatus(res)).toBe(202);
  });

  it('lifts message into meta', () => {
    const res = mockRes();
    authOk(res, null, { message: 'Hello' });
    expect(lastBody(res).meta.message).toBe('Hello');
  });

  it('omits meta entirely when none provided', () => {
    const res = mockRes();
    authOk(res, { x: 1 });
    expect(lastBody(res).meta).toBeUndefined();
  });
});

describe('authResponse.authFail()', () => {
  it('emits { success: false, error: { message, code } }', () => {
    const res = mockRes();
    authFail(res, {
      message: 'bad creds',
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    });
    expect(lastBody(res)).toMatchObject({
      success: false,
      error: {
        message: 'bad creds',
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      },
    });
  });

  it('infers HTTP status from the canonical code map when unspecified', () => {
    const res = mockRes();
    authFail(res, {
      message: 'nope',
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    });
    expect(lastStatus(res)).toBe(
      statusForAuthCode(AUTH_ERROR_CODES.INVALID_CREDENTIALS)
    );
    expect(lastStatus(res)).toBe(401);
  });

  it('falls back to 500 for unknown codes', () => {
    const res = mockRes();
    authFail(res, { message: 'boom', code: 'NOT_A_REAL_CODE' });
    expect(lastStatus(res)).toBe(500);
  });

  it('includes details only outside production', () => {
    const original = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';
      const dev = mockRes();
      authFail(dev, {
        message: 'x',
        code: AUTH_ERROR_CODES.INTERNAL_ERROR,
        details: { trace: 'a' },
      });
      expect(lastBody(dev).error.details).toEqual({ trace: 'a' });

      process.env.NODE_ENV = 'production';
      const prod = mockRes();
      authFail(prod, {
        message: 'x',
        code: AUTH_ERROR_CODES.INTERNAL_ERROR,
        details: { trace: 'a' },
      });
      expect(lastBody(prod).error.details).toBeUndefined();
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});

describe('authResponse.authValidationError()', () => {
  it('returns 400 with VALIDATION_ERROR code and details.fields', () => {
    const res = mockRes();
    authValidationError(res, [
      { path: 'email', msg: 'is required' },
      { param: 'password', message: 'too short' },
    ]);
    expect(lastStatus(res)).toBe(400);
    expect(lastBody(res).success).toBe(false);
    expect(lastBody(res).error.code).toBe(AUTH_ERROR_CODES.VALIDATION_ERROR);
    expect(lastBody(res).error.details.fields).toEqual([
      { field: 'email', message: 'is required' },
      { field: 'password', message: 'too short' },
    ]);
  });

  it('handles an empty errors array', () => {
    const res = mockRes();
    authValidationError(res, []);
    expect(lastStatus(res)).toBe(400);
    expect(lastBody(res).error.details.fields).toEqual([]);
  });
});

describe('authResponse.authFailFromError()', () => {
  it('preserves status + message from a ServiceError', () => {
    const res = mockRes();
    authFailFromError(res, new ServiceError(404, 'gone'), {
      code: AUTH_ERROR_CODES.USER_NOT_FOUND,
    });
    expect(lastStatus(res)).toBe(404);
    expect(lastBody(res).error.message).toBe('gone');
    expect(lastBody(res).error.code).toBe(AUTH_ERROR_CODES.USER_NOT_FOUND);
  });

  it('falls back to 500 INTERNAL_ERROR for unexpected errors', () => {
    const res = mockRes();
    authFailFromError(res, new Error('boom'), {});
    expect(lastStatus(res)).toBe(500);
    expect(lastBody(res).error.code).toBe(AUTH_ERROR_CODES.INTERNAL_ERROR);
  });
});

describe('AUTH_ERROR_CODES', () => {
  it('exposes a stable, frozen catalogue of codes', () => {
    expect(Object.isFrozen(AUTH_ERROR_CODES)).toBe(true);
    // Spot-check the codes the lifecycle relies on.
    [
      'VALIDATION_ERROR',
      'INVALID_CREDENTIALS',
      'MFA_REQUIRED',
      'MFA_INVALID',
      'MFA_DISABLED',
      'MFA_RESEND_FAILED',
      'TOKEN_INVALID',
      'REFRESH_FAILED',
      'LOGOUT_FAILED',
      'CURRENT_PASSWORD_INVALID',
      'PASSWORD_MISMATCH',
      'PASSWORD_REUSE',
      'WEAK_PASSWORD',
      'RESET_CODE_INVALID',
      'RESET_TOKEN_INVALID',
      'RESET_FAILED',
    ].forEach((key) => {
      expect(AUTH_ERROR_CODES[key]).toMatch(/^AUTH_/);
    });
  });

  it('every defined code has a default HTTP status', () => {
    Object.values(AUTH_ERROR_CODES).forEach((code) => {
      expect(typeof statusForAuthCode(code)).toBe('number');
    });
  });
});

// ── Controller-level shape checks (no Express, no DB, no network) ────────────

describe('userPasswordController emits the canonical envelope', () => {
  let controller;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('../../model/updateUserPassword.js', () => jest.fn());
    jest.doMock('../../model/getUserPassword.js', () => jest.fn());
    jest.doMock('../../services/authService', () => ({
      trustedDeviceCookieName: 'trusted_device',
      logoutAll: jest.fn().mockResolvedValue({ message: 'ok' }),
    }));
    controller = require('../../controller/userPasswordController');
  });

  afterAll(() => {
    jest.dontMock('../../model/updateUserPassword.js');
    jest.dontMock('../../model/getUserPassword.js');
    jest.dontMock('../../services/authService');
  });

  function mkReq(overrides = {}) {
    return {
      user: { userId: 'user-1' },
      body: {},
      ip: '127.0.0.1',
      get: () => 'jest',
      headers: {},
      ...overrides,
    };
  }

  it('returns AUTH_TOKEN_INVALID when no req.user', async () => {
    const res = mockRes();
    await controller.verifyCurrentPassword(mkReq({ user: undefined }), res);
    expect(lastStatus(res)).toBe(401);
    expect(lastBody(res).error.code).toBe(AUTH_ERROR_CODES.TOKEN_INVALID);
  });

  it('returns AUTH_CURRENT_PASSWORD_REQUIRED when password missing', async () => {
    const res = mockRes();
    await controller.verifyCurrentPassword(mkReq(), res);
    expect(lastStatus(res)).toBe(400);
    expect(lastBody(res).error.code).toBe(
      AUTH_ERROR_CODES.CURRENT_PASSWORD_REQUIRED
    );
  });

  it('returns AUTH_UNAUTHORIZED_USER_CONTEXT when body user_id mismatches', async () => {
    const res = mockRes();
    await controller.verifyCurrentPassword(
      mkReq({ body: { password: 'x', user_id: 'someone-else' } }),
      res
    );
    expect(lastStatus(res)).toBe(403);
    expect(lastBody(res).error.code).toBe(
      AUTH_ERROR_CODES.UNAUTHORIZED_USER_CONTEXT
    );
  });

  it('returns AUTH_PASSWORD_MISMATCH when confirm differs from new', async () => {
    const res = mockRes();
    await controller.updateUserPassword(
      mkReq({
        body: {
          password: 'old-Pass1!',
          new_password: 'New-Pass1!',
          confirm_password: 'Different-Pass1!',
        },
      }),
      res
    );
    expect(lastStatus(res)).toBe(400);
    expect(lastBody(res).error.code).toBe(AUTH_ERROR_CODES.PASSWORD_MISMATCH);
  });

  it('returns AUTH_PASSWORD_REUSE when new equals current', async () => {
    const res = mockRes();
    await controller.updateUserPassword(
      mkReq({
        body: {
          password: 'Same-Pass1!',
          new_password: 'Same-Pass1!',
          confirm_password: 'Same-Pass1!',
        },
      }),
      res
    );
    expect(lastStatus(res)).toBe(400);
    expect(lastBody(res).error.code).toBe(AUTH_ERROR_CODES.PASSWORD_REUSE);
  });

  it('returns AUTH_WEAK_PASSWORD for non-compliant new password', async () => {
    const res = mockRes();
    await controller.updateUserPassword(
      mkReq({
        body: {
          password: 'old-Pass1!',
          new_password: 'short',
          confirm_password: 'short',
        },
      }),
      res
    );
    expect(lastStatus(res)).toBe(400);
    expect(lastBody(res).error.code).toBe(AUTH_ERROR_CODES.WEAK_PASSWORD);
  });
});
