const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { authenticateToken } = require('../middleware/authenticateToken');

// Basic authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Token management routes
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);

// User information routes
router.get('/profile', authenticateToken, authController.getProfile);

// Keep existing logging routes (backwards compatibility)
router.post('/log-login-attempt', authController.logLoginAttempt);

// Test routes
router.get('/dashboard', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: `Welcome to NutriHelp, ${req.user.email}`,
        user: {
            id: req.user.userId,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// Health check route
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Auth service is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;