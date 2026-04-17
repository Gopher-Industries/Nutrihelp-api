const { expect } = require('chai');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
process.env.JWT_TOKEN = process.env.JWT_TOKEN || 'test-jwt-secret';

const { ServiceError } = require('../services/serviceError');
const loginService = require('../services/loginService');
const signupService = require('../services/signupService');

describe('Auth services', () => {
  it('loginService rejects missing credentials before any integration work', async () => {
    try {
      await loginService.login({ email: '', password: '' });
      throw new Error('Expected loginService.login to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.equal('Email and password are required');
    }
  });

  it('loginService rejects missing MFA fields before any integration work', async () => {
    try {
      await loginService.loginMfa({ email: 'user@example.com', password: 'Secret123!', mfaToken: '' });
      throw new Error('Expected loginService.loginMfa to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.equal('Email, password, and token are required');
    }
  });

  it('signupService rejects weak passwords before any database work', async () => {
    try {
      await signupService.signup({
        name: 'User',
        email: 'user@example.com',
        password: 'weak',
        contactNumber: '',
        address: '',
        ip: '127.0.0.1',
        userAgent: 'mocha'
      });
      throw new Error('Expected signupService.signup to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.equal('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      expect(error.details).to.deep.equal({ code: 'WEAK_PASSWORD' });
    }
  });
});
