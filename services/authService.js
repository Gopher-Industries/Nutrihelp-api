const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const authRepository = require('../repositories/wearable-device/authRepository');

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
      const existingUser = await authRepository.findUserIdByEmail(email).catch((error) => {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = await authRepository.createUser({
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
      });

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
      const user = await authRepository.findUserWithRoleByEmail(email).catch((error) => {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      });

      if (!user) throw new Error('Invalid credentials');
      if (user.account_status !== 'active') throw new Error('Account is not active');

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) throw new Error('Invalid credentials');

      const tokens = await this.generateTokenPair(user, deviceInfo);

      await authRepository.updateLastLogin(user.user_id, new Date().toISOString());

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

      await authRepository.deactivateSessionsByUserId(user.user_id);

      const rawRefreshToken = crypto.randomBytes(32).toString('hex');
      const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 12);
      const lookupHash = this.createLookupHash(rawRefreshToken);
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

      await authRepository.createRefreshSession({
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

      const sessions = await authRepository.findActiveSessionsByLookupHash(lookupHash);

      if (!sessions || sessions.length === 0) {
        throw new Error('Invalid refresh token');
      }

      const session = sessions[0];

      const match = await bcrypt.compare(refreshToken, session.refresh_token);
      if (!match) throw new Error('Invalid refresh token');

      if (new Date(session.expires_at) < new Date()) {
        throw new Error('Refresh token expired');
      }

      const user = await authRepository.findUserById(session.user_id).catch((error) => {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.account_status !== 'active') {
        throw new Error('Account is not active');
      }


      const newTokens = await this.generateTokenPair(user, deviceInfo);

      await authRepository.deactivateSessionById(session.id);

      return {
        success: true,
        ...newTokens
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /* =========================
     Logout
     ========================= */
  async logout(refreshToken) {
    try {
      const lookupHash = this.createLookupHash(refreshToken);

      await authRepository.deactivateSessionsByLookupHash(lookupHash);

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
      await authRepository.deactivateSessionsByUserId(userId);

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
      await authRepository.insertAuthLog({
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
      await authRepository.deactivateExpiredSessions(new Date().toISOString());
    } catch {
      // silent by design
    }
  }
}

module.exports = new AuthService();
