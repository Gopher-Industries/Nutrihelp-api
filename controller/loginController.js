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
const { ok, fail, validationError } = require("../utils/apiResponse");
const { msg } = require("../utils/messages");

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
    return validationError(res, errors.array());
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

    return fail(
      res,
      msg("auth.login.failed_missing_fields"),
      400,
      "AUTH_MISSING_FIELDS"
    );
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
      return res.status(429).json({
        error: "❌ Too many failed login attempts. Please try again after 10 minutes.",
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
      return fail(res, msg("auth.login.failed_not_found"), 404, "AUTH_NOT_FOUND");
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
        return res.status(429).json({
          warning:
            "⚠ You have one attempt left before your account is temporarily locked.",
        });
      }

      await sendFailedLoginAlert(email, clientIp);
      return fail(
        res,
        msg("auth.login.failed_credentials"),
        401,
        "AUTH_INVALID_CREDENTIALS"
      );
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
      return ok(
        res,
        { message: "An MFA Token has been sent to your email address" },
        202
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
    return ok(res, { user: sanitizeUserForResponse(user), token });
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
    return fail(res, msg("general.internal_error"), 500, "INTERNAL_ERROR");
  }
};

const loginMfa = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const mfa_token = req.body.mfa_token;

  if (!email || !password || !mfa_token) {
    return fail(res, msg("auth.login.mfa_required"), 400, "AUTH_MFA_REQUIRED");
  }

  try {
    const user = await getUserCredentials(email);
    if (!user) {
      return fail(
        res,
        msg("auth.login.failed_credentials"),
        401,
        "AUTH_INVALID_CREDENTIALS"
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    const validToken = await verifyMfaToken(user.user_id, mfa_token);

    if (!validPassword || !validToken) {
      return fail(res, msg("auth.login.mfa_invalid"), 401, "AUTH_MFA_INVALID");
    }

    const token = createAccessToken(user);
    return ok(res, { user: sanitizeUserForResponse(user), token });
  } catch (err) {
    logger.error("MFA error", err);
    return fail(res, msg("general.internal_error"), 500, "INTERNAL_ERROR");
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
    return validationError(res, errors.array());
  }

  const email = req.body.email?.trim().toLowerCase();

  try {
    const user = await getUserCredentials(email);

    if (!user || !user.mfa_enabled) {
      return fail(res, "MFA is not enabled for this account", 404, "AUTH_MFA_DISABLED");
    }

    await invalidateMfaTokens(user.user_id);

    const token = crypto.randomInt(100000, 999999);
    await addMfaToken(user.user_id, token);
    await sendOtpEmail(user.email, token);

    return ok(res, { message: "A new MFA token has been sent to your email address" });
  } catch (err) {
    logger.error("MFA resend error", err);
    return fail(res, "Unable to resend MFA token", 500, "AUTH_MFA_RESEND_FAILED");
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
