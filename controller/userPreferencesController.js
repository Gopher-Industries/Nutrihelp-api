const logger = require('../utils/logger');
const { ServiceError } = require('../services/serviceError');
const fetchUserPreferences = require('../model/fetchUserPreferences');
const updateUserPreferences = require('../model/updateUserPreferences');
const userPreferencesService = require('../services/userPreferencesService');

function handleError(res, error, label, context = {}) {
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

const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    const userPreferences = await fetchUserPreferences(userId);
    return res.status(200).json(userPreferences);
  } catch (error) {
    return handleError(res, error, 'Error fetching user preferences', { userId: req.user?.userId });
  }
};

const postUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    await updateUserPreferences(userId, req.body);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, 'Error updating user preferences', { userId: req.user?.userId });
  }
};

const getExtendedUserPreferences = async (req, res) => {
  try {
    const response = await userPreferencesService.getExtendedPreferences(req.user.userId);
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error, 'Error fetching extended user preferences', { userId: req.user?.userId });
  }
};

const updateExtendedUserPreferences = async (req, res) => {
  try {
    const response = await userPreferencesService.updateExtendedPreferences(req.user.userId, req.body);
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error, 'Error updating extended user preferences', { userId: req.user?.userId });
  }
};

const getNotificationPreferences = async (req, res) => {
  try {
    const response = await userPreferencesService.getNotificationPreferences(req.user.userId);
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error, 'Error fetching notification preferences', { userId: req.user?.userId });
  }
};

const updateNotificationPreferences = async (req, res) => {
  try {
    const response = await userPreferencesService.updateNotificationPreferences(
      req.user.userId,
      req.body.notification_preferences || {}
    );
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error, 'Error updating notification preferences', { userId: req.user?.userId });
  }
};

module.exports = {
  getUserPreferences,
  postUserPreferences,
  getExtendedUserPreferences,
  updateExtendedUserPreferences,
  getNotificationPreferences,
  updateNotificationPreferences
};
