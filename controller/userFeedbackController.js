const { validationResult } = require('express-validator');

const addUserFeedback = require('../model/addUserFeedback.js');
const logger = require('../utils/logger');
const support = require('../utils/supportResponse');

/**
 * POST /api/userfeedback
 * Persists user feedback and returns the standardized support envelope.
 */
const userfeedback = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return support.sendValidationError(res, errors.array());
  }

  const { user_id, name, contact_number, email, experience, message } = req.body;

  try {
    await addUserFeedback(
      user_id,
      name,
      contact_number,
      email,
      experience,
      message
    );

    return support.sendCreated(
      res,
      { received: true },
      { message: 'Thanks — your feedback has been recorded.' }
    );
  } catch (error) {
    logger.error('userfeedback: failed to persist feedback', {
      error: error.message,
      user_id,
      email,
    });
    return support.sendError(
      res,
      500,
      'We could not save your feedback. Please try again shortly.',
      'USER_FEEDBACK_FAILED'
    );
  }
};

module.exports = { userfeedback };
