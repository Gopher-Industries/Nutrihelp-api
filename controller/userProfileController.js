const userProfileService = require('../services/userProfileService');
const { ServiceError } = require('../services/serviceError');
const logger = require('../utils/logger');

function resolveTargetLookup(req) {
  const isAdmin = req.user?.role === 'admin';
  const explicitUserId = req.query.userId || req.body.targetUserId || req.body.userId || null;
  const explicitEmail = req.query.email || req.body.targetEmail || null;
  const legacyAdminEmailTarget = isAdmin && !req.body.profile && !explicitUserId && !explicitEmail
    ? req.body.email
    : null;

  if (isAdmin && explicitUserId) {
    return { userId: explicitUserId };
  }

  if (isAdmin && (explicitEmail || legacyAdminEmailTarget)) {
    return { email: explicitEmail || legacyAdminEmailTarget };
  }

  return { userId: req.user?.userId };
}

function handleProfileError(res, error, label, context = {}) {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  logger.error(label, { error: error.message, ...context });
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

const getUserProfile = async (req, res) => {
  try {
    const response = await userProfileService.getCanonicalProfile(resolveTargetLookup(req));
    return res.status(200).json(response);
  } catch (error) {
    return handleProfileError(res, error, 'Error fetching user profile', {
      actorUserId: req.user?.userId
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const response = await userProfileService.updateCanonicalProfile({
      actor: req.user,
      targetLookup: resolveTargetLookup(req),
      body: req.body
    });

    return res.status(200).json(response);
  } catch (error) {
    return handleProfileError(res, error, 'Error updating user profile', {
      actorUserId: req.user?.userId
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile
};
