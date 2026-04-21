console.log("🟢 Loaded AuthService from:", __filename);
console.log("URL:", process.env.SUPABASE_URL);
console.log("KEY:", process.env.SUPABASE_ANON_KEY);
console.log("LOGIN FUNCTION HIT");

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { logSecurityEvent } = require('./securityEventService');
const logLoginEvent = require('../Monitor_&_Logging/loginLogger');
const { ServiceError } = require('./serviceError');
const userProfileService = require('./userProfileService');

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AuthService {
  constructor() {
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.trustedDeviceExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.trustedDeviceCookieName = 'trusted_device';
  }

  /* =========================
     Helper
     ========================= */
  createLookupHash(token) {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')
      .slice(0, 16);
  }

  hashDeviceFingerprint(deviceInfo = {}) {
    return crypto
      .createHash('sha256')
      .update(String(deviceInfo.userAgent || 'unknown-device'))
      .digest('hex');
  }

  async logSecurityEvent(userId, eventType, deviceInfo = {}, details = {}) {
    try {
      await logLoginEvent({
        userId,
        eventType,
        ip: deviceInfo.ip || null,
        userAgent: deviceInfo.userAgent || null,
        details,
      });
    } catch {
      // silent by design
    }
  }

  /* =========================
     Register
     ========================= */
  async register(userData) {
    const { name, email, password, first_name, last_name } = userData;

    try {
      if (!name || !email || !password) {
        throw new ServiceError(400, 'Name, email, and password are required');
      }

      const { data: existingUser } = await supabaseAnon
        .from('users')
        .select('user_id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new ServiceError(400, 'User already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const { data: newUser, error } = await supabaseAnon
        .from('users')
        .insert({
          name,
          email,
          password: hashedPassword,
          first_name,
          last_name,
          role_id: 7,
          account_status: 'active',
          email_verified: false,
          mfa_enabled: false,
          registration_date: new Date().toISOString()
        })
        .select('user_id, email, name')
        .single();

      if (error) throw error;

      return {
        success: true,
        user: newUser,
        message: 'User registered successfully'
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(400, `Registration failed: ${error.message}`);
    }
  }

  /* =========================
     Login
     ========================= */
  async login(loginData, deviceInfo = {}) {
    console.log("LOGIN FUNCTION HIT");
    const { email, password } = loginData;

    try {
      if (!email || !password) {
        throw new ServiceError(400, 'Email and password are required');
      }

      const { data: user, error } = await supabaseAnon
        .from('users')
        .select(`
          user_id, email, password, name, role_id,
          account_status, email_verified,
          user_roles!inner(id, role_name)
        `)
        .eq('email', email)
        .single();

      if (error || !user) {
        await logSecurityEvent({
          event_type: "LOGIN_FAILED",
          severity: "medium",
          user_id: null,
          ip_address: deviceInfo.ip || null,
          user_agent: deviceInfo.userAgent || null,
          resource: "/api/auth/login",
          metadata: {
            email,
            reason: "user_not_found"
          }
        });

        throw new Error('Invalid credentials');
      }

      if (user.account_status !== 'active') {
        await logSecurityEvent({
          event_type: "LOGIN_FAILED",
          severity: "medium",
          user_id: user.user_id,
          ip_address: deviceInfo.ip || null,
          user_agent: deviceInfo.userAgent || null,
          resource: "/api/auth/login",
          metadata: {
            email,
            reason: "account_inactive"
          }
        });

        throw new Error('Account is not active');
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        console.log("LOGIN FAILED TRIGGERED");
        await logSecurityEvent({
          event_type: "LOGIN_FAILED",
          severity: "medium",
          user_id: user.user_id,
          ip_address: deviceInfo.ip || null,
          user_agent: deviceInfo.userAgent || null,
          resource: "/api/auth/login",
          metadata: {
            email,
            reason: "invalid_password"
          }
        });

        throw new Error('Invalid credentials');
      }

      const tokens = await this.generateTokenPair(user, deviceInfo);

      await supabaseAnon
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', user.user_id);

      await this.logAuthAttempt(user.user_id, email, true, deviceInfo);

      await logSecurityEvent({
        event_type: "LOGIN_SUCCESS",
        severity: "low",
        user_id: user.user_id,
        ip_address: deviceInfo.ip || null,
        user_agent: deviceInfo.userAgent || null,
        resource: "/api/auth/login",
        metadata: {
          email
        }
      });

      return {
        success: true,
        user: {
          id: user.user_id,
          email: user.email,
          name: user.name,
          role: user.user_roles?.role_name || 'user'
        },
        ...tokens
      };
    } catch (error) {
      await this.logAuthAttempt(null, email, false, deviceInfo);
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(401, error.message);
    }
  }

  /* =========================
     Generate Tokens
     ========================= */
  async generateTokenPair(user, deviceInfo = {}) {
    try {
      const accessPayload = {
        userId: user.user_id,
        email: user.email,
        role: user.user_roles?.role_name || 'user',
        type: 'access'
      };

      const accessToken = jwt.sign(
        accessPayload,
        process.env.JWT_TOKEN,
        { expiresIn: this.accessTokenExpiry, algorithm: 'HS256' }
      );

      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('user_id', user.user_id);

      const rawRefreshToken = crypto.randomBytes(32).toString('hex');
      const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 12);
      const lookupHash = this.createLookupHash(rawRefreshToken);
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

      const { error } = await supabaseService
        .from('user_sessiontoken')
        .insert({
          user_id: user.user_id,
          refresh_token: hashedRefreshToken,
          refresh_token_lookup: lookupHash,
          token_type: 'refresh',
          device_info: deviceInfo,
          ip_address: deviceInfo.ip || null,
          user_agent: deviceInfo.userAgent || null,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (error) throw error;

      return {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 15 * 60,
        tokenType: 'Bearer'
      };
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /* =========================
     Refresh Token
     ========================= */
  async refreshAccessToken(refreshToken, deviceInfo = {}) {
    try {
      if (!refreshToken) {
        throw new ServiceError(400, 'Refresh token is required');
      }

      const lookupHash = this.createLookupHash(refreshToken);

      const { data: sessions, error } = await supabaseService
        .from('user_sessiontoken')
        .select(`
          id,
          user_id,
          refresh_token,
          refresh_token_lookup,
          expires_at,
          is_active
        `)
        .eq('refresh_token_lookup', lookupHash)
        .eq('is_active', true)
        .limit(1);

      
      if (error || !sessions || sessions.length === 0) {
        throw new ServiceError(401, 'Invalid refresh token');
      }

      const session = sessions[0];

      const match = await bcrypt.compare(refreshToken, session.refresh_token);
      if (!match) throw new ServiceError(401, 'Invalid refresh token');

      if (new Date(session.expires_at) < new Date()) {
        throw new ServiceError(401, 'Refresh token expired');
      }

      const { data: user, error: userError } = await supabaseAnon
        .from('users')
        .select(`
          user_id,
          email,
          name,
          role_id,
          account_status
        `)
        .eq('user_id', session.user_id)
        .single();

      if (userError || !user) {
        throw new ServiceError(404, 'User not found');
      }

      if (user.account_status !== 'active') {
        throw new ServiceError(403, 'Account is not active');
      }

      const newTokens = await this.generateTokenPair(user, deviceInfo);

      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('id', session.id);

      return {
        success: true,
        ...newTokens
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(401, `Token refresh failed: ${error.message}`);
    }
  }

  /* =========================
     Logout
     ========================= */
  async logout(refreshToken) {
    try {
      if (!refreshToken) {
        throw new ServiceError(400, 'Refresh token is required');
      }

      const lookupHash = this.createLookupHash(refreshToken);

      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('refresh_token_lookup', lookupHash);

      return { success: true, message: 'Logout successful' };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(500, `Logout failed: ${error.message}`);
    }
  }

  /* =========================
     Logout All
     ========================= */
  async logoutAll(userId, options = {}) {
    try {
      if (!userId) {
        throw new ServiceError(400, 'User ID is required');
      }

      const reason = options.reason || 'logout_all';
      const deviceInfo = options.deviceInfo || {};
      const { data: trustedDevices } = await supabaseService
        .from('user_sessiontoken')
        .select('id')
        .eq('user_id', userId)
        .eq('token_type', 'trusted_device')
        .eq('is_active', true);

      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('user_id', userId);

      if ((trustedDevices || []).length > 0) {
        await this.logSecurityEvent(userId, 'TRUSTED_DEVICE_REVOKED', deviceInfo, {
          reason,
          revoked_count: trustedDevices.length,
        });
      }

      return { success: true, message: 'Logged out from all devices' };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(500, `Logout all failed: ${error.message}`);
    }
  }

  async issueTrustedDeviceToken(userId, deviceInfo = {}) {
    try {
      const rawTrustedToken = crypto.randomBytes(32).toString('hex');
      const hashedTrustedToken = await bcrypt.hash(rawTrustedToken, 12);
      const lookupHash = this.createLookupHash(rawTrustedToken);
      const expiresAt = new Date(Date.now() + this.trustedDeviceExpiry);
      const deviceFingerprint = this.hashDeviceFingerprint(deviceInfo);

      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('token_type', 'trusted_device')
        .eq('is_active', true)
        .contains('device_info', { userAgentHash: deviceFingerprint });

      const { error } = await supabaseService
        .from('user_sessiontoken')
        .insert({
          user_id: userId,
          refresh_token: hashedTrustedToken,
          refresh_token_lookup: lookupHash,
          token_type: 'trusted_device',
          device_info: {
            trusted: true,
            userAgentHash: deviceFingerprint,
          },
          ip_address: deviceInfo.ip || null,
          user_agent: deviceInfo.userAgent || null,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        });

      if (error) throw error;

      await this.logSecurityEvent(userId, 'TRUSTED_DEVICE_CREATED', deviceInfo, {
        expires_at: expiresAt.toISOString(),
      });

      return {
        token: rawTrustedToken,
        expiresAt,
      };
    } catch (error) {
      throw new Error(`Trusted device issue failed: ${error.message}`);
    }
  }

  async validateTrustedDeviceToken(userId, rawToken, deviceInfo = {}) {
    try {
      if (!userId || !rawToken) {
        return { valid: false, reason: 'missing' };
      }

      const lookupHash = this.createLookupHash(rawToken);
      const { data: sessions, error } = await supabaseService
        .from('user_sessiontoken')
        .select('id, refresh_token, expires_at, is_active, device_info')
        .eq('user_id', userId)
        .eq('token_type', 'trusted_device')
        .eq('refresh_token_lookup', lookupHash)
        .eq('is_active', true)
        .limit(1);

      if (error || !sessions || sessions.length === 0) {
        return { valid: false, reason: 'missing' };
      }

      const trustedDevice = sessions[0];
      const tokenMatches = await bcrypt.compare(rawToken, trustedDevice.refresh_token);
      if (!tokenMatches) {
        return { valid: false, reason: 'invalid' };
      }

      if (new Date(trustedDevice.expires_at) < new Date()) {
        await supabaseService
          .from('user_sessiontoken')
          .update({ is_active: false })
          .eq('id', trustedDevice.id);
        return { valid: false, reason: 'expired' };
      }

      const expectedFingerprint = trustedDevice.device_info?.userAgentHash;
      const currentFingerprint = this.hashDeviceFingerprint(deviceInfo);
      if (expectedFingerprint && expectedFingerprint !== currentFingerprint) {
        return { valid: false, reason: 'device_mismatch' };
      }

      await this.logSecurityEvent(userId, 'TRUSTED_DEVICE_USED', deviceInfo, {
        trusted_device_id: trustedDevice.id,
      });

      return { valid: true, trustedDeviceId: trustedDevice.id };
    } catch (error) {
      return { valid: false, reason: 'error', error };
    }
  }

  async revokeTrustedDevices(userId, reason = 'manual', deviceInfo = {}) {
    try {
      const { data: trustedDevices } = await supabaseService
        .from('user_sessiontoken')
        .select('id')
        .eq('user_id', userId)
        .eq('token_type', 'trusted_device')
        .eq('is_active', true);

      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('token_type', 'trusted_device');

      if ((trustedDevices || []).length > 0) {
        await this.logSecurityEvent(userId, 'TRUSTED_DEVICE_REVOKED', deviceInfo, {
          reason,
          revoked_count: trustedDevices.length,
        });
      }

      return {
        success: true,
        revokedCount: (trustedDevices || []).length,
      };
    } catch (error) {
      throw new Error(`Trusted device revoke failed: ${error.message}`);
    }
  }

  /* =========================
     Verify Access Token
     ========================= */
  verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_TOKEN);
  }

  /* =========================
     Auth Logs
     ========================= */
  async logAuthAttempt(userId, email, success, deviceInfo) {
    try {
      await supabaseAnon
        .from('auth_logs')
        .insert({
          user_id: userId,
          email,
          success,
          ip_address: deviceInfo.ip || null,
          created_at: new Date().toISOString()
        });
    } catch {
      // silent by design
    }
  }

  /* =========================
     Cleanup
     ========================= */
  async cleanupExpiredSessions() {
    try {
      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString());
    } catch {
      // silent by design
    }
  }

  async getProfile(userId) {
    if (!userId) {
      throw new ServiceError(400, 'User ID is required');
    }

    return userProfileService.getCanonicalProfile({ userId });
  }

  async logLoginAttempt({ email, userId, success, ipAddress, createdAt }) {
    if (!email || success === undefined || !ipAddress || !createdAt) {
      throw new ServiceError(400, 'Missing required fields: email, success, ip_address, created_at');
    }

    const { error } = await supabaseAnon.from('auth_logs').insert([
      {
        email,
        user_id: userId || null,
        success,
        ip_address: ipAddress,
        created_at: createdAt
      }
    ]);

    if (error) {
      throw new ServiceError(500, 'Failed to log login attempt');
    }

    return { message: 'Login attempt logged successfully' };
  }

  async sendSmsCodeByEmail(email) {
    if (!email) {
      throw new ServiceError(400, 'Email is required');
    }

    const { data, error } = await supabaseAnon
      .from('users')
      .select('contact_number')
      .eq('email', email)
      .single();

    if (error || !data?.contact_number) {
      throw new ServiceError(404, 'Phone number not found for the given email');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📨 [DEV] Verification code for ${data.contact_number}: ${verificationCode}`);

    return {
      message: 'SMS code sent (check server console for code)',
      phone: data.contact_number
    };
  }
}

module.exports = new AuthService();