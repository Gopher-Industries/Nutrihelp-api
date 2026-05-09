/**
 * Localization & Message Consistency Tests
 *
 * Verifies that:
 * 1. All message keys resolve to non-empty strings
 * 2. Template variable substitution works correctly
 * 3. Missing keys fall back gracefully
 * 4. The locale file is well-formed JSON
 * 5. The localeMiddleware correctly attaches res.locals.msg
 */

const path = require('path');
const fs = require('fs');
const { msg, localeMiddleware } = require('../../utils/messages');

// ── Locale file integrity ──────────────────────────────────────────────────

describe('locales/en.json — file integrity', () => {
  let locale;

  beforeAll(() => {
    const filePath = path.join(__dirname, '../../locales/en.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    locale = JSON.parse(raw);
  });

  it('is valid JSON and can be parsed', () => {
    expect(typeof locale).toBe('object');
    expect(locale).not.toBeNull();
  });

  it('has required top-level sections', () => {
    const required = ['auth', 'validation', 'image', 'ai', 'general'];
    required.forEach((section) => {
      expect(locale).toHaveProperty(section);
    });
  });

  it('has no empty string values', () => {
    function checkValues(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object') {
          checkValues(value, fullPath);
        } else {
          expect(typeof value).toBe('string');
          expect(value.trim().length).toBeGreaterThan(0);
        }
      }
    }
    checkValues(locale);
  });
});

// ── msg() function ─────────────────────────────────────────────────────────

describe('msg() — key resolution', () => {
  it('resolves a nested key correctly', () => {
    const result = msg('auth.login.success');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('auth.login.success');
  });

  it('returns the key itself for unknown keys', () => {
    const result = msg('does.not.exist');
    expect(result).toBe('does.not.exist');
  });

  it('substitutes template variables', () => {
    const result = msg('validation.required_field', { field: 'Email' });
    expect(result).toContain('Email');
    expect(result).not.toContain('{{field}}');
  });

  it('leaves unknown template vars as-is', () => {
    const result = msg('validation.required_field', {});
    expect(result).toContain('{{field}}');
  });

  it('resolves all auth.login keys', () => {
    const keys = [
      'auth.login.success',
      'auth.login.failed_credentials',
      'auth.login.failed_not_found',
      'auth.login.failed_inactive',
      'auth.login.failed_missing_fields',
      'auth.login.mfa_required',
      'auth.login.mfa_invalid',
      'auth.login.mfa_sent',
    ];
    keys.forEach((key) => {
      const result = msg(key);
      expect(result).not.toBe(key);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it('resolves all image classification keys', () => {
    const keys = [
      'image.no_file',
      'image.invalid_type',
      'image.too_large',
      'image.classification_success',
      'image.classification_failed',
      'image.classification_timeout',
      'image.classification_unavailable',
    ];
    keys.forEach((key) => {
      const result = msg(key);
      expect(result).not.toBe(key);
    });
  });

  it('resolves all AI service keys', () => {
    const keys = [
      'ai.timeout',
      'ai.unavailable',
      'ai.failed',
      'ai.meal_plan_success',
      'ai.meal_plan_failed',
      'ai.recommendation_success',
      'ai.recommendation_failed',
    ];
    keys.forEach((key) => {
      const result = msg(key);
      expect(result).not.toBe(key);
    });
  });

  it('resolves all general error keys', () => {
    const keys = [
      'general.not_found',
      'general.forbidden',
      'general.internal_error',
      'general.bad_request',
      'general.rate_limited',
    ];
    keys.forEach((key) => {
      const result = msg(key);
      expect(result).not.toBe(key);
    });
  });
});

// ── localeMiddleware ───────────────────────────────────────────────────────

describe('localeMiddleware', () => {
  function buildMockReqRes(acceptLanguage = null) {
    const req = {
      headers: acceptLanguage ? { 'accept-language': acceptLanguage } : {},
    };
    const res = { locals: {} };
    const next = jest.fn();
    return { req, res, next };
  }

  it('attaches msg() to res.locals', () => {
    const { req, res, next } = buildMockReqRes();
    localeMiddleware(req, res, next);
    expect(typeof res.locals.msg).toBe('function');
    expect(next).toHaveBeenCalled();
  });

  it('res.locals.msg resolves keys correctly', () => {
    const { req, res, next } = buildMockReqRes();
    localeMiddleware(req, res, next);
    const result = res.locals.msg('auth.login.success');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to en when Accept-Language is unknown', () => {
    const { req, res, next } = buildMockReqRes('xx-UNKNOWN');
    localeMiddleware(req, res, next);
    const result = res.locals.msg('auth.login.success');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles multi-value Accept-Language header', () => {
    const { req, res, next } = buildMockReqRes('fr-FR,fr;q=0.9,en;q=0.8');
    localeMiddleware(req, res, next);
    // fr locale does not exist yet — should fall back to en
    const result = res.locals.msg('general.internal_error');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('passes template vars through res.locals.msg', () => {
    const { req, res, next } = buildMockReqRes();
    localeMiddleware(req, res, next);
    const result = res.locals.msg('validation.required_field', { field: 'Password' });
    expect(result).toContain('Password');
  });
});

// ── Response contract — success field ────────────────────────────────────

describe('responseContract middleware', () => {
  const responseContractMiddleware = require('../../middleware/responseContract');

  function buildRes(path = '/api/test') {
    const jsonCalls = [];
    const res = {
      json: jest.fn((body) => { jsonCalls.push(body); return res; }),
      status: jest.fn().mockReturnThis(),
      statusCode: 200,
    };
    res._jsonCalls = jsonCalls;
    return res;
  }

  it('does not modify a compliant { success: true, data } response', () => {
    const req = { path: '/api/test' };
    const res = buildRes();
    const next = jest.fn();

    responseContractMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    const body = { success: true, data: { foo: 'bar' } };
    res.json(body);

    // No warnings in the body for compliant responses
    expect(body._contractWarnings).toBeUndefined();
  });

  it('adds _contractWarnings in dev when success field is missing', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const req = { path: '/api/test' };
    const res = buildRes();
    const next = jest.fn();

    responseContractMiddleware(req, res, next);

    const body = { message: 'something', data: {} };
    res.json(body);

    expect(body._contractWarnings).toBeDefined();
    expect(body._contractWarnings.length).toBeGreaterThan(0);
    expect(body._contractWarnings[0]).toMatch(/success/);

    process.env.NODE_ENV = original;
  });

  it('does not add _contractWarnings in production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = { path: '/api/test' };
    const res = buildRes();
    const next = jest.fn();

    responseContractMiddleware(req, res, next);

    const body = { message: 'no success field' };
    res.json(body);

    expect(body._contractWarnings).toBeUndefined();

    process.env.NODE_ENV = original;
  });

  it('skips /api-docs paths', () => {
    const req = { path: '/api-docs/swagger.json' };
    const res = buildRes('/api-docs/swagger.json');
    const next = jest.fn();

    responseContractMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    // No json override was installed
    expect(res._jsonCalls.length).toBe(0);
  });
});
