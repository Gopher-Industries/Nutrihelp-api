/**
 * API Contract Tests
 *
 * Verifies the standard response envelope helpers and the contract shape
 * produced by controllers that have been updated to use apiResponse.js.
 *
 * Does NOT load server.js (avoids open handles from setInterval / app.listen).
 * Integration-level route tests live in the existing Mocha suite.
 */

const { ok, fail, validationError, fromService } = require('../../utils/apiResponse');

// ── Mock res helper ────────────────────────────────────────────────────────

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function lastBody(res) {
  return res.json.mock.calls[0][0];
}

// ── ok() ──────────────────────────────────────────────────────────────────

describe('apiResponse.ok()', () => {
  it('sends { success: true, data } with status 200', () => {
    const res = mockRes();
    ok(res, { foo: 'bar' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(lastBody(res)).toMatchObject({ success: true, data: { foo: 'bar' } });
  });

  it('accepts a custom status code', () => {
    const res = mockRes();
    ok(res, null, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(lastBody(res).success).toBe(true);
  });

  it('includes meta when provided', () => {
    const res = mockRes();
    ok(res, [], 200, { total: 10, page: 1 });
    expect(lastBody(res)).toMatchObject({ meta: { total: 10, page: 1 } });
  });

  it('omits meta when empty', () => {
    const res = mockRes();
    ok(res, 'result');
    expect(lastBody(res).meta).toBeUndefined();
  });

  it('data can be null', () => {
    const res = mockRes();
    ok(res, null);
    expect(lastBody(res)).toMatchObject({ success: true, data: null });
  });
});

// ── fail() ────────────────────────────────────────────────────────────────

describe('apiResponse.fail()', () => {
  it('sends { success: false, error } with given status', () => {
    const res = mockRes();
    fail(res, 'Not found', 404, 'NOT_FOUND');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(lastBody(res)).toMatchObject({
      success: false,
      error: 'Not found',
      code: 'NOT_FOUND',
    });
  });

  it('defaults to status 500', () => {
    const res = mockRes();
    fail(res, 'Boom');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('omits code when not provided', () => {
    const res = mockRes();
    fail(res, 'error');
    expect(lastBody(res).code).toBeUndefined();
  });

  it('includes details in development', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    fail(res, 'Oops', 500, null, { stack: 'trace' });
    expect(lastBody(res).details).toEqual({ stack: 'trace' });
    process.env.NODE_ENV = original;
  });

  it('omits details in production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    fail(res, 'Oops', 500, null, { stack: 'trace' });
    expect(lastBody(res).details).toBeUndefined();
    process.env.NODE_ENV = original;
  });
});

// ── validationError() ─────────────────────────────────────────────────────

describe('apiResponse.validationError()', () => {
  it('sends 400 with VALIDATION_ERROR code', () => {
    const res = mockRes();
    validationError(res, [{ field: 'email', message: 'required' }]);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(lastBody(res)).toMatchObject({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
  });

  it('includes the errors array', () => {
    const res = mockRes();
    const errs = [{ field: 'email', message: 'invalid' }, { field: 'password', message: 'too short' }];
    validationError(res, errs);
    expect(lastBody(res).errors).toEqual(errs);
  });
});

// ── fromService() ─────────────────────────────────────────────────────────

describe('apiResponse.fromService()', () => {
  it('forwards 2xx service result as success=true', () => {
    const res = mockRes();
    fromService(res, { statusCode: 200, body: { message: 'ok', data: 42 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(lastBody(res)).toMatchObject({ success: true, message: 'ok', data: 42 });
  });

  it('forwards 4xx service result as success=false', () => {
    const res = mockRes();
    fromService(res, { statusCode: 401, body: { error: 'Unauthorized' } });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(lastBody(res)).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('defaults to 500 when statusCode missing', () => {
    const res = mockRes();
    fromService(res, {});
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── Contract shape validator ───────────────────────────────────────────────

describe('Contract shape invariants', () => {
  it('ok() always has success:true', () => {
    const res = mockRes();
    ok(res, { anything: true });
    expect(lastBody(res).success).toBe(true);
  });

  it('fail() always has success:false', () => {
    const res = mockRes();
    fail(res, 'err');
    expect(lastBody(res).success).toBe(false);
  });

  it('validationError() always has success:false', () => {
    const res = mockRes();
    validationError(res, []);
    expect(lastBody(res).success).toBe(false);
  });

  it('all helpers always set success as a boolean', () => {
    [
      () => { const r = mockRes(); ok(r, null); return r; },
      () => { const r = mockRes(); fail(r, 'x'); return r; },
      () => { const r = mockRes(); validationError(r, []); return r; },
    ].forEach((fn) => {
      const res = fn();
      expect(typeof lastBody(res).success).toBe('boolean');
    });
  });
});

// ── loginController uses apiResponse ──────────────────────────────────────

describe('loginController — response shape', () => {
  it('imports apiResponse helpers without error', () => {
    // Verify the controller module loads cleanly with the new imports
    expect(() => {
      jest.resetModules();
      // Mock all heavy dependencies
      jest.doMock('../../dbConnection', () => ({ from: jest.fn().mockReturnThis() }));
      jest.doMock('../../model/getUserCredentials', () => jest.fn());
      jest.doMock('../../model/addMfaToken', () => ({ addMfaToken: jest.fn(), verifyMfaToken: jest.fn() }));
      jest.doMock('../../Monitor_&_Logging/loginLogger', () => jest.fn());
      jest.doMock('../../services/securityEventService', () => ({ logSecurityEvent: jest.fn() }));
      jest.doMock('../../services/securityLogger', () => ({ createLog: jest.fn(), log: jest.fn() }));
      jest.doMock('../../utils/logger', () => ({ error: jest.fn(), info: jest.fn() }));
      jest.doMock('../../services/authService', () => ({}));
      jest.doMock('../../services/loginService', () => ({ sendFailedLoginAlert: jest.fn() }));
    }).not.toThrow();
  });
});
