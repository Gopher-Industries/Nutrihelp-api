console.log("🟢 Loaded AuthService from:", __filename);
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class AuthService {
    constructor() {
        this.accessTokenExpiry = '15m';  // 15 minutes
        this.refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    /**
     * User Registration
     */
    async register(userData) {
        const { name, email, password, first_name, last_name } = userData;

        try {
            // Check if the user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('user_id')
                .eq('email', email)
                .single();

            if (existingUser) {
                throw new Error('User already exists');
            }

            // Hashed Passwords
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create User
            const { data: newUser, error } = await supabase
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

    /**
     * User login
     */
    async login(loginData, deviceInfo = {}) {
        const { email, password } = loginData;

        try {
            // Find User
            const { data: user, error } = await supabase
                .from('users')
                .select(`
                    user_id, email, password, name, role_id, 
                    account_status, email_verified,
                    user_roles!inner(id,role_name)
                `)
                .eq('email', email)
                .single();

            if (error || !user) {
                throw new Error('Invalid credentials');
            }

            // Check account status
            if (user.account_status !== 'active') {
                throw new Error('Account is not active');
            }

            // Verify Password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                throw new Error('Invalid credentials');
            }

            // Generate token pair
            const tokens = await this.generateTokenPair(user, deviceInfo);

            // Update last login time
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('user_id', user.user_id);

            // Record successful login
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
            // Login failures
            await this.logAuthAttempt(null, email, false, deviceInfo);
            throw error;
        }
    }

    /**
     * Generate access token and refresh token
     */
    async generateTokenPair(user, deviceInfo = {}) {
        try {
            // Build access token payload
            const accessPayload = {
                userId: user.user_id,
                email: user.email,
                role: user.user_roles?.role_name || 'user',
                type: 'access'
            };

            console.log("🔑 Signing access token with payload:", accessPayload);

            // Generate Access Token
            const accessToken = jwt.sign(
                accessPayload,
                process.env.JWT_TOKEN,
                { 
                    expiresIn: this.accessTokenExpiry,
                    algorithm: 'HS256'
                }
            );

            console.log("✅ Generated accessToken:", accessToken);

            // Generate a refresh token
            const refreshToken = crypto.randomBytes(40).toString('hex');
            const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

            // Store refresh token in database
            const { error } = await supabase
                .from('user_session')
                .insert({
                    user_id: user.user_id,
                    session_token: refreshToken,
                    refresh_token: refreshToken,
                    token_type: 'refresh',
                    device_info: deviceInfo,
                    ip_address: deviceInfo.ip || null,
                    user_agent: deviceInfo.userAgent || null,
                    expires_at: expiresAt.toISOString(),
                    is_active: true,
                });

            if (error) throw error;

            return {
                accessToken,
                refreshToken,
                expiresIn: 15 * 60, // 15 minutes in seconds
                tokenType: 'Bearer'
            };

        } catch (error) {
            throw new Error(`Token generation failed: ${error.message}`);
        }
    }

    /**
     * Refresh Access Token
     */
    async refreshAccessToken(refreshToken, deviceInfo = {}) {
        try {
            // Verifying the refresh token
            const { data: session, error } = await supabase
                .from('user_session')
                .select(`
                    id, user_id, expires_at, is_active,
                    users!inner(user_id, email, name, role_id, account_status,
                        user_roles!inner(id, role_name)
                    )
                `)
                .eq('refresh_token', refreshToken)
                .eq('is_active', true)
                .single();

            if (error || !session) {
                throw new Error('Invalid refresh token');
            }

            // Check if the token is expired
            if (new Date(session.expires_at) < new Date()) {
                throw new Error('Refresh token expired');
            }

            // Checking User Status
            const user = session.users;
            if (user.account_status !== 'active') {
                throw new Error('Account is not active');
            }

            // Generate a new token pair
            const newTokens = await this.generateTokenPair(user, deviceInfo);

            // Invalidate old refresh tokens
            await supabase
                .from('user_session')
                .update({ is_active: false })
                .eq('id', session.id);

            return {
                success: true,
                ...newTokens
            };

        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Logout
     */
    async logout(refreshToken) {
        try {
            if (refreshToken) {
                await supabase
                    .from('user_session')
                    .update({ is_active: false })
                    .eq('refresh_token', refreshToken);
            }

            return { success: true, message: 'Logout successful' };
        } catch (error) {
            throw new Error(`Logout failed: ${error.message}`);
        }
    }

    /**
     * Log out of all devices
     */
    async logoutAll(userId) {
        try {
            await supabase
                .from('user_session')
                .update({ is_active: false })
                .eq('user_id', userId);

            return { success: true, message: 'Logged out from all devices' };
        } catch (error) {
            throw new Error(`Logout all failed: ${error.message}`);
        }
    }

    /**
     * Verifying the Access Token
     */
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_TOKEN);
            console.log("🔍 Decoded token payload:", decoded);
            return decoded;
        } catch (error) {
            console.error("❌ Token verification failed:", error.message);
            throw new Error('Invalid access token');
        }
    }

    /**
     * Logging authentication attempts
     */
    async logAuthAttempt(userId, email, success, deviceInfo) {
        try {
            await supabase
                .from('auth_logs')
                .insert({
                    user_id: userId,
                    email: email,
                    success: success,
                    ip_address: deviceInfo.ip || null,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Failed to log auth attempt:', error);
        }
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        try {
            await supabase
                .from('user_session')
                .update({ is_active: false })
                .lt('expires_at', new Date().toISOString());
        } catch (error) {
            console.error('Failed to cleanup expired sessions:', error);
        }
    }
}

module.exports = new AuthService();