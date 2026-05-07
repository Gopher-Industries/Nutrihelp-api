const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const getUserCredentials = require("../model/getUserCredentials.js");
const {
  addMfaToken,
  invalidateMfaTokens,
  verifyMfaToken,
} = require("../model/addMfaToken.js");
const crypto = require("crypto");
const supabase = require("../dbConnection");
const { validationResult } = require("express-validator");
const { logSecurityEvent } = require("../services/securityEventService");
const { createLog, log } = require("../services/securityLogger");
const logger = require("../utils/logger");
const nodemailer = require("nodemailer");
const {
  authOk,
  authFail,
  authValidationError,
  AUTH_ERROR_CODES,
} = require("../services/authResponse");
const { msg } = require("../utils/messages");
const { sessionHookOnLoginSuccess } = require("../services/sessionLogService");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function sanitizeUserForResponse(user) {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
}

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.user_roles?.role_name || "unknown",
      type: "access",
    },
    process.env.JWT_TOKEN,
    { expiresIn: "1h" }
  );
}

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return authValidationError(res, errors.array());
  }

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  let clientIp =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
  clientIp = clientIp === "::1" ? "127.0.0.1" : clientIp;

  if (!email || !password) {
    log(
      createLog({
        event_type: "AUTH_LOGIN_FAILED",
        severity_level: "MEDIUM",
        user_id: null,
        source_service: "login-controller",
        ip_address: clientIp,
        endpoint: req.originalUrl,
        method: req.method,
        status: "FAILED",
        message: "Missing email or password",
      })
    );

    return authFail(res, {
      message: msg("auth.login.failed_missing_fields"),
      code: AUTH_ERROR_CODES.MISSING_FIELDS,
      status: 400,
    });
  }

  const tenMinutesAgoISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  try {
    const { data: failuresByEmail } = await supabase
      .from("brute_force_logs")
      .select("id")
      .eq("email", email)
      .eq("success", false)
      .gte("created_at", tenMinutesAgoISO);

    const failureCount = failuresByEmail?.length || 0;

    if (failureCount >= 10) {
      return authFail(res, {
        message:
          "Too many failed login attempts. Please try again after 10 minutes.",
        code: AUTH_ERROR_CODES.RATE_LIMITED,
        status: 429,
      });
    }

    const user = await getUserCredentials(email);

    if (!user) {
      await supabase.from("brute_force_logs").insert([
        {
          email,
          ip_address: clientIp,
          success: false,
          created_at: new Date().toISOString(),
        },
      ]);

      await logSecurityEvent({
        event_type: "LOGIN_FAILED",
        severity: "medium",
        user_id: null,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login",
        metadata: {
          email,
          reason: "account_not_found",
        },
      });

      log(
        createLog({
          event_type: "AUTH_LOGIN_FAILED",
          severity_level: "MEDIUM",
          user_id: null,
          source_service: "login-controller",
          ip_address: clientIp,
          endpoint: req.originalUrl,
          method: req.method,
          status: "FAILED",
          message: "User not found",
        })
      );

      await sendFailedLoginAlert(email, clientIp);
      // Privacy-preserving: surface the same shape as invalid credentials so
      // attackers can't enumerate accounts. Code stays distinct for ops/logs.
      return authFail(res, {
        message: msg("auth.login.failed_credentials"),
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        status: 401,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await supabase.from("brute_force_logs").insert([
        {
          email,
          ip_address: clientIp,
          success: false,
          created_at: new Date().toISOString(),
        },
      ]);

      await logSecurityEvent({
        event_type: "LOGIN_FAILED",
        severity: "medium",
        user_id: user.user_id,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login",
        metadata: {
          email,
          reason: "invalid_password",
        },
      });

      log(
        createLog({
          event_type: "AUTH_LOGIN_FAILED",
          severity_level: "MEDIUM",
          user_id: user.user_id,
          source_service: "login-controller",
          ip_address: clientIp,
          endpoint: req.originalUrl,
          method: req.method,
          status: "FAILED",
          message: "Invalid password",
        })
      );

      if (failureCount === 4) {
        return authFail(res, {
          message:
            "You have one attempt left before your account is temporarily locked.",
          code: AUTH_ERROR_CODES.RATE_LIMITED,
          status: 429,
          details: { attemptsRemaining: 1 },
        });
      }

      await sendFailedLoginAlert(email, clientIp);
      return authFail(res, {
        message: msg("auth.login.failed_credentials"),
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        status: 401,
      });
    }

    await supabase.from("brute_force_logs").insert([
      {
        email,
        success: true,
        created_at: new Date().toISOString(),
      },
    ]);

    await supabase
      .from("brute_force_logs")
      .delete()
      .eq("email", email)
      .eq("success", false);

    log(
      createLog({
        event_type: "AUTH_LOGIN_SUCCESS",
        severity_level: "LOW",
        user_id: user.user_id,
        source_service: "login-controller",
        ip_address: clientIp,
        endpoint: req.originalUrl,
        method: req.method,
        status: "SUCCESS",
        message: "User logged in successfully",
      })
    );

    if (user.mfa_enabled) {
      const mfaToken = crypto.randomInt(100000, 999999);
      await addMfaToken(user.user_id, mfaToken);
      await sendOtpEmail(user.email, mfaToken);
      return authOk(
        res,
        { mfaRequired: true, mfaChannel: "email" },
        {
          status: 202,
          message: "An MFA token has been sent to your email address.",
          meta: { nextStep: "POST /api/login/mfa" },
        }
      );
    }

    await logLoginEvent({
      userId: user.user_id,
      eventType: "LOGIN_SUCCESS",
      ip: clientIp,
      userAgent: req.headers["user-agent"],
    });

    await logSecurityEvent({
      event_type: "LOGIN_SUCCESS",
      severity: "low",
      user_id: user.user_id,
      session_id: null,
      ip_address: clientIp,
      user_agent: req.headers["user-agent"],
      resource: "/api/auth/login",
      metadata: {
        email,
      },
    });

    const token = createAccessToken(user);    
    // CT-004 Week 6: Log session for alert A6 (geo-impossible travel detection)
    try {
      await sessionHookOnLoginSuccess(req, user);
    } catch (hookErr) {
      logger.warn('[loginController] sessionHookOnLoginSuccess failed:', hookErr.message);
      // Don't block login if hook fails
    }
    return authOk(res, {
      user: sanitizeUserForResponse(user),
      session: { accessToken: token, tokenType: "Bearer" },
    });
  } catch (err) {
    log(
      createLog({
        event_type: "SYSTEM_ERROR",
        severity_level: "HIGH",
        user_id: null,
        source_service: "login-controller",
        ip_address: clientIp,
        endpoint: req.originalUrl,
        method: req.method,
        status: "ERROR",
        message: err.message,
      })
    );

    logger.error("Login error", err);
    return authFail(res, {
      message: msg("general.internal_error"),
      code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      status: 500,
    });
  }
};

const loginMfa = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return authValidationError(res, errors.array());
  }

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const mfa_token = req.body.mfa_token;

  if (!email || !password || !mfa_token) {
    return authFail(res, {
      message: msg("auth.login.mfa_required"),
      code: AUTH_ERROR_CODES.MFA_REQUIRED,
      status: 400,
    });
  }

  try {
    const user = await getUserCredentials(email);
    if (!user) {
      return authFail(res, {
        message: msg("auth.login.failed_credentials"),
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        status: 401,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    const validToken = await verifyMfaToken(user.user_id, mfa_token);

    if (!validPassword || !validToken) {
      return authFail(res, {
        message: msg("auth.login.mfa_invalid"),
        code: AUTH_ERROR_CODES.MFA_INVALID,
        status: 401,
      });
    }

    const token = createAccessToken(user);
    return authOk(res, {
      user: sanitizeUserForResponse(user),
      session: { accessToken: token, tokenType: "Bearer" },
    });
  } catch (err) {
    logger.error("MFA error", err);
    return authFail(res, {
      message: msg("general.internal_error"),
      code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      status: 500,
    });
  }
};

async function sendOtpEmail(email, token) {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.log(`📨 [DEV] MFA code for ${email}: ${token}`);
      return;
    }

    await transporter.sendMail({
      from: `"NutriHelp Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "NutriHelp Login Token",
      text: `Your one-time login token is: ${token}\n\nThis token expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n- NutriHelp Security Team`,
      html: `
        <p>Your one-time login token is:</p>
        <h2>${token}</h2>
        <p>This token expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br/>
        <p>- NutriHelp Security Team</p>
      `,
    });
    console.log("OTP email sent successfully to", email);
  } catch (err) {
    console.error("Error sending OTP email:", err.message);
  }
}

const resendMfa = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return authValidationError(res, errors.array());
  }

  const email = req.body.email?.trim().toLowerCase();

  try {
    const user = await getUserCredentials(email);

    if (!user || !user.mfa_enabled) {
      return authFail(res, {
        message: "MFA is not enabled for this account",
        code: AUTH_ERROR_CODES.MFA_DISABLED,
        status: 404,
      });
    }

    await invalidateMfaTokens(user.user_id);

    const token = crypto.randomInt(100000, 999999);
    await addMfaToken(user.user_id, token);
    await sendOtpEmail(user.email, token);

    return authOk(
      res,
      { mfaChannel: "email" },
      { message: "A new MFA token has been sent to your email address." }
    );
  } catch (err) {
    logger.error("MFA resend error", err);
    return authFail(res, {
      message: "Unable to resend MFA token",
      code: AUTH_ERROR_CODES.MFA_RESEND_FAILED,
      status: 500,
    });
  }
};

async function sendFailedLoginAlert(email, ip) {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.log(`[DEV] Failed login alert for ${email} from IP ${ip}`);
      return;
    }

    await transporter.sendMail({
      from: `"NutriHelp Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Failed Login Attempt on NutriHelp",
      text: `Hi,\n\nSomeone tried to log in to NutriHelp using your email address from IP: ${ip}.\n\nIf this wasn't you, please ignore this message. If you're concerned, consider resetting your password or contacting support.\n\n- NutriHelp Security Team`,
      html: `
        <p>Hi,</p>
        <p>Someone tried to log in to <strong>NutriHelp</strong> using your email address from IP: <code>${ip}</code>.</p>
        <p>If this wasn't you, please ignore this message. If you're concerned, consider resetting your password or contacting support.</p>
        <br/>
        <p>- NutriHelp Security Team</p>
      `,
    });
    console.log(`Failed login alert sent to ${email}`);
  } catch (err) {
    console.error("Failed to send alert email:", err.message);
  }
}

module.exports = { login, loginMfa, resendMfa };
