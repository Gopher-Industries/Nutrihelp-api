const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { authenticateToken } = require('../middleware/authenticateToken');

// Register and login
router.post('/register', authController.register);
router.post('/login', authController.login);

// Token management
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);

// User information
router.get('/profile', authenticateToken, authController.getProfile);

// Keep existing logging endpoint
router.post('/log-login', authController.logLoginAttempt);

// Protected route example (replace existing dashboard)
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

module.exports = router;