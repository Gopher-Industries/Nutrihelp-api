const authService = require('../services/authService');
const { createClient } = require('@supabase/supabase-js');
const {
    createSuccessResponse,
    createErrorResponse,
    formatProfile,
    formatSession
} = require('../services/apiResponseService');

function getSupabaseClient() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
    );
}

function getDeviceInfo(req) {
    return {
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        deviceId: req.get('X-Device-Id') || null,
        clientType: req.get('X-Client-Type') || 'web'
    };
}

/**
 * User Registration
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, first_name, last_name } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json(createErrorResponse(
                'Name, email, and password are required',
                'VALIDATION_ERROR'
            ));
        }

        const result = await authService.register({
            name, email, password, first_name, last_name
        });

        res.status(201).json(createSuccessResponse({
            user: {
                id: result.user?.user_id || null,
                email: result.user?.email || email,
                name: result.user?.name || name
            }
        }, {
            message: result.message || 'User registered successfully'
        }));

    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json(createErrorResponse(error.message, 'REGISTER_FAILED'));
    }
};

/**
 * User Login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json(createErrorResponse(
                'Email and password are required',
                'VALIDATION_ERROR'
            ));
        }

        // Collect device information
        const result = await authService.login({ email, password }, getDeviceInfo(req));

        res.json(createSuccessResponse({
            user: result.user,
            session: formatSession(result)
        }));

    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json(createErrorResponse(error.message, 'AUTHENTICATION_FAILED'));
    }
};

/**
 * Refresh Token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json(createErrorResponse(
                'Refresh token is required',
                'VALIDATION_ERROR'
            ));
        }

        const result = await authService.refreshAccessToken(refreshToken, getDeviceInfo(req));

        res.json(createSuccessResponse({
            session: formatSession(result)
        }));

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json(createErrorResponse(error.message, 'REFRESH_FAILED'));
    }
};

/**
 * User Logout
 */
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        const result = await authService.logout(refreshToken);

        res.json(createSuccessResponse(null, {
            message: result.message
        }));

    } catch (error) {
        console.error('Logout error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json(createErrorResponse(error.message, 'LOGOUT_FAILED'));
    }
};

/**
 * User Logout All
 */
exports.logoutAll = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await authService.logoutAll(userId);

        res.json(createSuccessResponse(null, {
            message: result.message
        }));

    } catch (error) {
        console.error('Logout all error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json(createErrorResponse(error.message, 'LOGOUT_ALL_FAILED'));
    }
};

/**
 * Get Current User Profile
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await authService.getProfile(userId);

        res.json(createSuccessResponse({
            user: formatProfile(result.user)
        }));

    } catch (error) {
        console.error('Get profile error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json(createErrorResponse(
            statusCode === 404 ? 'User not found' : 'Internal server error',
            statusCode === 404 ? 'USER_NOT_FOUND' : 'PROFILE_LOAD_FAILED'
        ));
    }
};

// Keep existing logging functionality (backward compatibility)
exports.logLoginAttempt = async (req, res) => {
    const { email, user_id, success, ip_address, created_at } = req.body;

    if (!email || success === undefined || !ip_address || !created_at) {
        return res.status(400).json({
            error: 'Missing required fields: email, success, ip_address, created_at',
        });
    }

    const { error } = await getSupabaseClient().from('auth_logs').insert([
        {
            email,
            user_id: user_id || null,
            success,
            ip_address,
            created_at,
        },
    ]);

    if (error) {
        console.error('❌ Failed to insert login log:', error);
        return res.status(500).json({ error: 'Failed to log login attempt' });
    }

    return res.status(201).json({ message: 'Login attempt logged successfully' });
};



exports.sendSMSByEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('contact_number')
      .eq('email', email)
      .single();

    if (error || !data?.contact_number) {
      return res.status(404).json({ error: 'Phone number not found for the given email' });
    }
    const phone = data.contact_number;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`📨 [DEV] Verification code for ${phone}: ${verificationCode}`);


    return res.status(200).json({
      message: 'SMS code sent (check server console for code)',
      phone,
    });
  } catch (err) {
    console.error('❌ Error sending SMS:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
