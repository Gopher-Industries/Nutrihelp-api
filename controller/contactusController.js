const { validationResult } = require('express-validator');

const addContactUsMsg = require('../model/addContactUsMsg.js');
const logger = require('../utils/logger');
const support = require('../utils/supportResponse');
const emailService = require('../utils/emailService');

/**
 * POST /api/contactus
 *
 * 1. Validate payload (express-validator chain runs in the route).
 * 2. Persist the message via the existing model.
 * 3. Fire the support-inbox email and the user acknowledgement in parallel.
 *    Email failures are logged but do NOT fail the request — the user's
 *    submission has been captured and we'd rather degrade gracefully.
 * 4. Return a standardized envelope with delivery hints in `meta`.
 */
const contactus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return support.sendValidationError(res, errors.array());
  }

  const { name, email, subject, message } = req.body;

  try {
    await addContactUsMsg(name, email, subject, message);
  } catch (error) {
    logger.error('contactus: failed to persist message', {
      error: error.message,
      email,
    });
    return support.sendError(
      res,
      500,
      'We could not save your message. Please try again shortly.',
      'CONTACT_REQUEST_FAILED'
    );
  }

  // Email dispatch — never block the user response on transient SMTP issues.
  const [supportResult, ackResult] = await Promise.allSettled([
    emailService.sendSupportNotification({ name, email, subject, message }),
    emailService.sendContactAcknowledgement({ name, email, subject }),
  ]);

  const emailMeta = {
    supportNotified: supportResult.status === 'fulfilled' && !supportResult.value?.skipped,
    acknowledgementSent: ackResult.status === 'fulfilled' && !ackResult.value?.skipped,
    smtpConfigured: emailService.isSmtpConfigured(),
  };

  if (supportResult.status === 'rejected') {
    logger.warn('contactus: support inbox email failed', {
      error: supportResult.reason?.message,
      email,
    });
  }
  if (ackResult.status === 'rejected') {
    logger.warn('contactus: acknowledgement email failed', {
      error: ackResult.reason?.message,
      email,
    });
  }

  return support.sendCreated(
    res,
    {
      received: true,
      email: emailMeta,
    },
    {
      message: 'Your message has been received. Our team will be in touch soon.',
    }
  );
};

module.exports = { contactus };
