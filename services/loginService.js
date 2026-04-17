const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const supabase = require('../dbConnection');
const logLoginEvent = require('../Monitor_&_Logging/loginLogger');
const getUserCredentials = require('../model/getUserCredentials');
const { addMfaToken, verifyMfaToken } = require('../model/addMfaToken');
const { ServiceError } = require('./serviceError');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendOtpEmail(email, token) {
  try {
    await transporter.sendMail({
      from: `"NutriHelp Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'NutriHelp Login Token',
      text: `Your one-time login token is: ${token}\n\nThis token expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n- NutriHelp Security Team`,
      html: `
        <p>Your one-time login token is:</p>
        <h2>${token}</h2>
        <p>This token expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br/>
        <p>- NutriHelp Security Team</p>
      `
    });
  } catch (error) {
    console.error('Error sending OTP email:', error.message);
  }
}

async function sendFailedLoginAlert(email, ip) {
  try {
    await transporter.sendMail({
      from: `"NutriHelp Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Failed Login Attempt on NutriHelp',
      text: `Hi,\n\nSomeone tried to log in to NutriHelp using your email address from IP: ${ip}.\n\nIf this wasn't you, please ignore this message. If you're concerned, consider resetting your password or contacting support.\n\n- NutriHelp Security Team`,
      html: `
        <p>Hi,</p>
        <p>Someone tried to log in to <strong>NutriHelp</strong> using your email address from IP: <code>${ip}</code>.</p>
        <p>If this wasn't you, please ignore this message. If you're concerned, consider resetting your password or contacting support.</p>
        <br/>
        <p>- NutriHelp Security Team</p>
      `
    });
  } catch (error) {
    console.error('Failed to send alert email:', error.message);
  }
}

function normalizeIp(rawIp) {
  const ip = rawIp || '';
  return ip === '::1' ? '127.0.0.1' : ip;
}

function buildJwt(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      role: user.user_roles?.role_name || 'unknown'
    },
    process.env.JWT_TOKEN,
    { expiresIn: '1h' }
  );
}

async function recordBruteForceAttempt(email, ip, success) {
  await supabase.from('brute_force_logs').insert([{
    email,
    ip_address: ip || null,
    success,
    created_at: new Date().toISOString()
  }]);
}

async function getRecentFailureCount(email) {
  const tenMinutesAgoISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('brute_force_logs')
    .select('id')
    .eq('email', email)
    .eq('success', false)
    .gte('created_at', tenMinutesAgoISO);

  return data?.length || 0;
}

class LoginService {
  async login({ email, password, ip, userAgent }) {
    if (!email || !password) {
      throw new ServiceError(400, 'Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedIp = normalizeIp(ip);
    const failureCount = await getRecentFailureCount(normalizedEmail);

    if (failureCount >= 10) {
      throw new ServiceError(429, '❌ Too many failed login attempts. Please try again after 10 minutes.');
    }

    const user = await getUserCredentials(normalizedEmail);

    if (!user) {
      await recordBruteForceAttempt(normalizedEmail, normalizedIp, false);
      await sendFailedLoginAlert(normalizedEmail, normalizedIp);
      throw new ServiceError(404, 'Account not found. Please create an account first.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await recordBruteForceAttempt(normalizedEmail, normalizedIp, false);

      if (failureCount === 4) {
        throw new ServiceError(429, '⚠ You have one attempt left before your account is temporarily locked.', {
          warningOnly: true
        });
      }

      await sendFailedLoginAlert(normalizedEmail, normalizedIp);
      throw new ServiceError(401, 'Invalid password');
    }

    await recordBruteForceAttempt(normalizedEmail, normalizedIp, true);
    await supabase.from('brute_force_logs').delete()
      .eq('email', normalizedEmail)
      .eq('success', false);

    if (user.mfa_enabled) {
      const mfaToken = crypto.randomInt(100000, 999999);
      await addMfaToken(user.user_id, mfaToken);
      await sendOtpEmail(user.email, mfaToken);
      return {
        statusCode: 202,
        body: {
          message: 'An MFA Token has been sent to your email address'
        }
      };
    }

    await logLoginEvent({
      userId: user.user_id,
      eventType: 'LOGIN_SUCCESS',
      ip: normalizedIp,
      userAgent
    });

    return {
      statusCode: 200,
      body: {
        user,
        token: buildJwt(user)
      }
    };
  }

  async loginMfa({ email, password, mfaToken }) {
    if (!email || !password || !mfaToken) {
      throw new ServiceError(400, 'Email, password, and token are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserCredentials(normalizedEmail);

    if (!user) {
      throw new ServiceError(401, 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ServiceError(401, 'Invalid email or password');
    }

    const tokenValid = await verifyMfaToken(user.user_id, mfaToken);
    if (!tokenValid) {
      throw new ServiceError(401, 'Token is invalid or has expired');
    }

    return {
      statusCode: 200,
      body: {
        user,
        token: buildJwt(user)
      }
    };
  }
}

module.exports = new LoginService();
