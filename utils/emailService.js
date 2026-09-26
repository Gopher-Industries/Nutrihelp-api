/**
 * utils/emailService.js
 *
 * Lightweight wrapper around Nodemailer used by support flows
 * (Contact Us acknowledgements, support inbox forwarding, etc.).
 *
 * Configuration (env):
 *   SMTP_HOST           e.g. "smtp.gmail.com" / "smtp.sendgrid.net"
 *   SMTP_PORT           e.g. 587
 *   SMTP_SECURE         "true" | "false"  (defaults to false)
 *   SMTP_USER           SMTP username
 *   SMTP_PASS           SMTP password / API key
 *   SUPPORT_EMAIL       Inbox that receives Contact Us submissions
 *                       (defaults to SMTP_USER if unset)
 *   MAIL_FROM           Display "From" address (defaults to SUPPORT_EMAIL)
 *
 * Behaviour:
 *   - If SMTP credentials are not configured we fall back to a JSON-stream
 *     transport that logs the message instead of sending. This keeps dev,
 *     CI, and tests safe by default.
 *   - The transport is cached after the first call. Call resetTransport()
 *     in tests when you want to swap implementations.
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');

let cachedTransport = null;
let cachedSignature = null;

function buildSignature() {
  return [
    process.env.SMTP_HOST || '',
    process.env.SMTP_PORT || '',
    process.env.SMTP_SECURE || '',
    process.env.SMTP_USER || '',
    process.env.SMTP_PASS ? '***' : '',
  ].join('|');
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getTransport() {
  const signature = buildSignature();
  if (cachedTransport && cachedSignature === signature) {
    return cachedTransport;
  }

  if (isSmtpConfigured()) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Safe fallback: don't send anything, just log.
    cachedTransport = nodemailer.createTransport({
      jsonTransport: true,
    });
    logger.warn(
      'emailService: SMTP not configured. Falling back to jsonTransport. ' +
        'Set SMTP_HOST/SMTP_USER/SMTP_PASS to send real email.'
    );
  }

  cachedSignature = signature;
  return cachedTransport;
}

function getFromAddress() {
  return (
    process.env.MAIL_FROM ||
    process.env.SUPPORT_EMAIL ||
    process.env.SMTP_USER ||
    'no-reply@nutrihelp.local'
  );
}

function getSupportInbox() {
  return process.env.SUPPORT_EMAIL || process.env.SMTP_USER || null;
}

async function sendMail({ to, subject, text, html, replyTo }) {
  if (!to) {
    throw new Error('emailService.sendMail: "to" is required');
  }
  if (!subject) {
    throw new Error('emailService.sendMail: "subject" is required');
  }

  const transport = getTransport();
  const message = {
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  };
  if (replyTo) {
    message.replyTo = replyTo;
  }

  try {
    const info = await transport.sendMail(message);
    logger.info('emailService: mail sent', {
      to,
      subject,
      messageId: info.messageId,
      simulated: !isSmtpConfigured(),
    });
    return info;
  } catch (error) {
    logger.error('emailService: failed to send mail', {
      to,
      subject,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Email the support inbox with a user submission.
 */
async function sendSupportNotification({ name, email, subject, message }) {
  const inbox = getSupportInbox();
  if (!inbox) {
    logger.warn(
      'emailService.sendSupportNotification: no SUPPORT_EMAIL/SMTP_USER set; ' +
        'skipping support inbox delivery.'
    );
    return { skipped: true, reason: 'no_support_inbox' };
  }

  const safeName = String(name || '').trim() || 'Anonymous user';
  const safeEmail = String(email || '').trim() || 'no-reply@unknown';
  const safeSubject = String(subject || '').trim() || '(no subject)';
  const safeMessage = String(message || '').trim();

  const text = [
    'A new Contact Us submission has been received.',
    '',
    `Name:    ${safeName}`,
    `Email:   ${safeEmail}`,
    `Subject: ${safeSubject}`,
    '',
    'Message:',
    safeMessage,
  ].join('\n');

  return sendMail({
    to: inbox,
    subject: `[NutriHelp Support] ${safeSubject}`,
    text,
    replyTo: safeEmail,
  });
}

/**
 * Email the user a confirmation that their submission was received.
 */
async function sendContactAcknowledgement({ name, email, subject }) {
  if (!email) return { skipped: true, reason: 'no_recipient' };

  const safeName = String(name || '').trim() || 'there';
  const safeSubject = String(subject || '').trim() || 'your message';

  const text = [
    `Hi ${safeName},`,
    '',
    `Thanks for reaching out to NutriHelp. We've received your message regarding "${safeSubject}" and a member of our team will get back to you shortly.`,
    '',
    'You do not need to reply to this email. If you have additional details to share, just send us another message through the Contact Us form.',
    '',
    '— The NutriHelp Support Team',
  ].join('\n');

  return sendMail({
    to: email,
    subject: 'We received your message — NutriHelp Support',
    text,
  });
}

function resetTransport() {
  cachedTransport = null;
  cachedSignature = null;
}

module.exports = {
  sendMail,
  sendSupportNotification,
  sendContactAcknowledgement,
  isSmtpConfigured,
  getSupportInbox,
  getFromAddress,
  getTransport,
  resetTransport,
};
