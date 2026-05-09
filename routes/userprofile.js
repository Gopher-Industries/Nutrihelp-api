const express = require("express");
const router = express.Router();
const { authAndIdentity } = require('../controller');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validateRequest');
const { updateUserProfileValidation } = require('../validators/userProfileValidator');

const {
  userProfile: controller,
  updateUserProfile: updateUserProfileController
} = authAndIdentity;

router.get('/', authenticateToken, (req, res) => {
  return controller.getUserProfile(req, res);
});

router.put('/', authenticateToken, updateUserProfileValidation, validate, (req, res) => {
  return controller.updateUserProfile(req, res);
});

router.put('/update-by-identifier',
  authenticateToken,
  authorizeRoles('admin'),
  updateUserProfileController.updateUserProfile
);

module.exports = router;
