const authService = require('../services/authService');

/**
 * Enhanced authentication middleware
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required',
            code: 'TOKEN_MISSING'
        });
    }

    try {
        const decoded = authService.verifyAccessToken(token);

        //
        if (decoded.type && decoded.type !== 'access') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token type',
                code: 'INVALID_TOKEN_TYPE'
            });
        }

        if (!decoded.type && !decoded.role) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token structure',
                code: 'INVALID_TOKEN'
            });
        }

        // Attach user info to request
        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Access token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid access token',
                code: 'INVALID_TOKEN'
            });
        }

        console.error('Token verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Optional authentication middleware
 * (attaches user if token exists, otherwise continues without blocking)
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = authService.verifyAccessToken(token);
        req.user = decoded;
    } catch (error) {
        req.user = null;
    }
    
    next();
};

module.exports = {
    authenticateToken,
    optionalAuth
};