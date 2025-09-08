const express = require("express");
const router = express.Router();
const controller = require('../controller/userProfileController.js');
const updateUserProfileController = require('../controller/updateUserProfileController.js');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

// Get logged-in user's profile OR admin can get any profile via query param
router.get('/', authenticateToken, (req, res) => {
  // If admin → allow fetching with ?userId=xxx
  if (req.user.role === 'admin' && req.query.userId) {
    req.params.userId = req.query.userId;
    return controller.getUserProfile(req, res);
  }

  // If normal user → only allow their own profile
  req.params.userId = req.user.userId;
  return controller.getUserProfile(req, res);
});

// Update profile (user can only update their own, admin can update anyone)
router.put('/', authenticateToken, (req, res) => {
  if (req.user.role === 'admin' || req.user.userId == req.body.user_id) {
    return controller.updateUserProfile(req, res);
  }
  return res.status(403).json({ success: false, error: 'Forbidden: You can only update your own profile' });
});

// Update profile by unique identifier (admin only)
router.put('/update-by-identifier',
  authenticateToken,
  authorizeRoles('admin'),
  updateUserProfileController.updateUserProfile
);

module.exports = router;