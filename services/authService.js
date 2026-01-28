console.log("🟢 Loaded AuthService from:", __filename);
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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

  /* =========================
     Register
     ========================= */
  async register(userData) {
    const { name, email, password, first_name, last_name } = userData;

    try {
      const { data: existingUser } = await supabaseAnon
        .from('users')
        .select('user_id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('User already exists');
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
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /* =========================
     Login
     ========================= */
  async login(loginData, deviceInfo = {}) {
    const { email, password } = loginData;

    try {
      const { data: user, error } = await supabaseAnon
        .from('users')
        .select(`
          user_id, email, password, name, role_id,
          account_status, email_verified,
          user_roles!inner(id, role_name)
        `)
        .eq('email', email)
        .single();

      if (error || !user) throw new Error('Invalid credentials');
      if (user.account_status !== 'active') throw new Error('Account is not active');

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) throw new Error('Invalid credentials');

      const tokens = await this.generateTokenPair(user, deviceInfo);

      await supabaseAnon
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', user.user_id);

      await this.logAuthAttempt(user.user_id, email, true, deviceInfo);

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
      throw error;
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
      
      console.log('supabase query result:', { sessions, error});

      if (error || !sessions || sessions.length === 0) {
        throw new Error('Invalid refresh token');
      }

      const session = sessions[0];

      const match = await bcrypt.compare(refreshToken, session.refresh_token);
      if (!match) throw new Error('Invalid refresh token');

      if (new Date(session.expires_at) < new Date()) {
        throw new Error('Refresh token expired');
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
        throw new Error('User not found');
      }

      if (user.account_status !== 'active') {
        throw new Error('Account is not active');
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
      console.error('REFRESH FAILED:', error.message);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /* =========================
     Logout
     ========================= */
  async logout(refreshToken) {
    try {
      const lookupHash = this.createLookupHash(refreshToken);

      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('refresh_token_lookup', lookupHash);

      return { success: true, message: 'Logout successful' };
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /* =========================
     Logout All
     ========================= */
  async logoutAll(userId) {
    try {
      await supabaseService
        .from('user_sessiontoken')
        .update({ is_active: false })
        .eq('user_id', userId);

      return { success: true, message: 'Logged out from all devices' };
    } catch (error) {
      throw new Error(`Logout all failed: ${error.message}`);
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
}

module.exports = new AuthService();
