const authService = require('../services/authService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * User Registration
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, first_name, last_name } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        const result = await authService.register({
            name, email, password, first_name, last_name
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * User Login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Collect device information
        const deviceInfo = {
            ip: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        const result = await authService.login({ email, password }, deviceInfo);

        res.json(result);

    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Refresh Token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const deviceInfo = {
            ip: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        const result = await authService.refreshAccessToken(refreshToken, deviceInfo);

        res.json(result);

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * User Logout
 */
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        const result = await authService.logout(refreshToken);

        res.json(result);

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * User Logout All
 */
exports.logoutAll = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await authService.logoutAll(userId);

        res.json(result);

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get Current User Profile
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: user, error } = await supabase
            .from('users')
            .select(`
                user_id, email, name, first_name, last_name,
                registration_date, last_login, account_status,
                user_roles!inner(role_name)
            `)
            .eq('user_id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.user_id,
                email: user.email,
                name: user.name,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.user_roles?.role_name,
                registrationDate: user.registration_date,
                lastLogin: user.last_login,
                accountStatus: user.account_status
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
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

    const { error } = await supabase.from('auth_logs').insert([
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