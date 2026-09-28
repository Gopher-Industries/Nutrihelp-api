const express = require('express');
const router = express.Router();
const { authAndIdentity } = require('../controller');
const { authenticateToken } = require('../middleware/authenticateToken');
const { registerValidation } = require('../validators/signupValidator');
const validate = require('../middleware/validateRequest');

const { auth: authController } = authAndIdentity;

console.log('authAndIdentity:', authAndIdentity);
console.log('authController:', authController);

// =====================================================
// 🔐 EXISTING AUTH ROUTES
// =====================================================
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', authController.login);
// router.post('/google/exchange', authController.googleExchange);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
// router.post('/logout-all', authenticateToken, authController.logoutAll);
// router.post('/trusted-devices/revoke', authenticateToken, authController.revokeTrustedDevices);
router.get('/profile', authenticateToken, authController.getProfile);
// router.post('/log-login-attempt', authController.logLoginAttempt);

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

// =====================================================
// 🚀 OAUTH AUTHORIZE (ONLY ONE)
// =====================================================
router.get('/authorize', (req, res) => {
  const { redirect_uri } = req.query;

  console.log("✅ OAuth Authorize hit");

  const code = "dummy_auth_code_123";

  res.redirect(`${redirect_uri}?code=${code}`);
});

// =====================================================
// 🚀 OAUTH TOKEN (ONLY ONE)
// =====================================================
router.post('/token', (req, res) => {
  console.log("✅ OAuth Token hit");

  res.json({
  success: true,
  data: {
    access_token: "test_access_token_123",
    refresh_token: "test_refresh_token_123",
    expires_in: 3600,
    token_type: "Bearer"
  }
});
});

module.exports = router;