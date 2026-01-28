const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { authenticateToken } = require('../middleware/authenticateToken');
const { registerValidation } = require('../validators/signupValidator');
const validate = require('../middleware/validateRequest');

// --- Authentication routes ---
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/log-login-attempt', authController.logLoginAttempt);

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

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;