const { expect } = require('chai');
const jwt = require('jsonwebtoken');

describe('verifyAIToken', () => {
  let authService;

  const originalEnv = {
    AI_JWT_TOKEN: process.env.AI_JWT_TOKEN,
    AI_JWT_ISSUER: process.env.AI_JWT_ISSUER,
    AI_JWT_AUDIENCE: process.env.AI_JWT_AUDIENCE,
    AI_JWT_KEY_ID: process.env.AI_JWT_KEY_ID,
  };

  before(() => {
    process.env.AI_JWT_TOKEN = 'test-ai-secret';
    process.env.AI_JWT_ISSUER = 'nutrihelp-ai';
    process.env.AI_JWT_AUDIENCE = 'nutrihelp-api';
    process.env.AI_JWT_KEY_ID = 'ai-key-1';

    authService = require('../services/authService');
  });

  after(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  function signAIToken(overrides = {}, options = {}) {
    const payload = {
      userId: 7,
      email: 'user@example.com',
      role: 'user',
      type: 'ai_access',
      ...overrides,
    };

    return jwt.sign(
      payload,
      process.env.AI_JWT_TOKEN,
      {
        algorithm: options.algorithm || 'HS256',
        issuer: options.issuer || process.env.AI_JWT_ISSUER,
        audience: options.audience || process.env.AI_JWT_AUDIENCE,
        keyid: options.keyid || process.env.AI_JWT_KEY_ID,
        expiresIn: '5m',
      }
    );
  }

  it('accepts a valid AI token', () => {
    const token = signAIToken();

    const decoded = authService.verifyAIToken(token);

    expect(decoded.userId).to.equal(7);
    expect(decoded.type).to.equal('ai_access');
  });

  it('rejects a token with the wrong issuer', () => {
    const token = signAIToken({}, {
      issuer: 'wrong-issuer',
    });

    expect(() => authService.verifyAIToken(token)).to.throw();
  });

  it('rejects a token with the wrong audience', () => {
    const token = signAIToken({}, {
      audience: 'wrong-audience',
    });

    expect(() => authService.verifyAIToken(token)).to.throw();
  });

  it('rejects a token with the wrong key id', () => {
    const token = signAIToken({}, {
      keyid: 'wrong-key',
    });

    expect(() => authService.verifyAIToken(token)).to.throw();
  });

  it('rejects a token signed with a different algorithm', () => {
    const token = jwt.sign(
      {
        userId: 7,
        email: 'user@example.com',
        role: 'user',
        type: 'ai_access',
      },
      process.env.AI_JWT_TOKEN,
      {
        algorithm: 'HS384',
        issuer: process.env.AI_JWT_ISSUER,
        audience: process.env.AI_JWT_AUDIENCE,
        keyid: process.env.AI_JWT_KEY_ID,
        expiresIn: '5m',
      }
    );

    expect(() => authService.verifyAIToken(token)).to.throw();
  });
});
