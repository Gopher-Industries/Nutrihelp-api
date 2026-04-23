const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const getUserCredentials = require("../model/getUserCredentials.js");
const { addMfaToken, verifyMfaToken } = require("../model/addMfaToken.js");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const supabase = require("../dbConnection");
const { validationResult } = require("express-validator");
const { logSecurityEvent } = require("../services/securityEventService");

const { createLog, log } = require("../services/securityLogger");
const logger = require("../utils/logger");
const authService = require("../services/authService");
const nodemailer = require("nodemailer");
const { ok, fail, validationError } = require("../utils/apiResponse");
const { msg } = require("../utils/messages");

// ✅ SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_KEY);

// ✅ Access Token
function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      role: user.user_roles?.role_name || "unknown",
    },
    process.env.JWT_TOKEN,
    { expiresIn: "1h" }
  );
}

// ================= LOGIN =================
const login = async (req, res) => {
  console.log("LOGIN CONTROLLER HIT");
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

    return fail(res, msg('auth.login.failed_missing_fields'), 400, 'AUTH_MISSING_FIELDS');
  }

  try {
    const user = await getUserCredentials(email);

    if (!user) {
      await supabase.from("brute_force_logs").insert([{
        email,
        ip_address: clientIp,
        success: false,
        created_at: new Date().toISOString()
      }]);

      await logSecurityEvent({
        event_type: "LOGIN_FAILED",
        severity: "medium",
        user_id: null,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login",
        metadata: {
          email,
          reason: "account_not_found"
        }
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
      return fail(res, msg('auth.login.failed_not_found'), 404, 'AUTH_NOT_FOUND');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await supabase.from("brute_force_logs").insert([{
        email,
        ip_address: clientIp,
        success: false,
        created_at: new Date().toISOString()
      }]);

      console.log("About to log LOGIN_FAILED event");

      await logSecurityEvent({
        event_type: "LOGIN_FAILED",
        severity: "medium",
        user_id: user.user_id,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login",
        metadata: {
          email,
          reason: "invalid_password"
        }
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

      await sendFailedLoginAlert(email, clientIp);
      return fail(res, msg('auth.login.failed_credentials'), 401, 'AUTH_INVALID_CREDENTIALS');
    }

    // ✅ SUCCESS LOG
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

    await logLoginEvent({
      userId: user.user_id,
      eventType: "LOGIN_SUCCESS",
      ip: clientIp,
      userAgent: req.headers["user-agent"]
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
        email
      }
    });

    const token = createAccessToken(user);

    return ok(res, { user, token });
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
    return fail(res, msg('general.internal_error'), 500, 'INTERNAL_ERROR');
  }
};

// ================= MFA =================
const loginMfa = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const mfa_token = req.body.mfa_token;

  if (!email || !password || !mfa_token) {
    return fail(res, msg('auth.login.mfa_required'), 400, 'AUTH_MFA_REQUIRED');
  }

  try {
    const user = await getUserCredentials(email);
    if (!user) {
      return fail(res, msg('auth.login.failed_credentials'), 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    const validToken = await verifyMfaToken(user.user_id, mfa_token);

    if (!validPassword || !validToken) {
      return fail(res, msg('auth.login.mfa_invalid'), 401, 'AUTH_MFA_INVALID');
    }

    const token = createAccessToken(user);

    return ok(res, { user, token });
  } catch (err) {
    logger.error("MFA error", err);
    return fail(res, msg('general.internal_error'), 500, 'INTERNAL_ERROR');
  }
};

module.exports = { login, loginMfa };