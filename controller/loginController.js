const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const getUserCredentials = require("../model/getUserCredentials.js");
const { addMfaToken, verifyMfaToken } = require("../model/addMfaToken.js");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const { logSecurityEvent } = require("../services/securityEventService");
const logger = require("../utils/logger");

// Access token helper
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
    return res.status(400).json({ errors: errors.array() });
  }

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  let clientIp =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
  clientIp = clientIp === "::1" ? "127.0.0.1" : clientIp;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await getUserCredentials(email);

    // User not found
    if (!user) {
      await logSecurityEvent({
        event_type: "LOGIN_FAILED",
        severity: "medium",
        user_id: null,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login",
        metadata: {
          email,
          reason: "user_not_found",
        },
      });

      return res.status(401).json({ error: "Invalid email" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Wrong password
    if (!isPasswordValid) {
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

      return res.status(401).json({ error: "Invalid password" });
    }

    // MFA enabled
    if (user.mfa_enabled) {
      const token = crypto.randomInt(100000, 999999);

      await addMfaToken(user.user_id, token);

      await logSecurityEvent({
        event_type: "MFA_CHALLENGE_ISSUED",
        severity: "low",
        user_id: user.user_id,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login",
        metadata: {
          email,
        },
      });

      return res.status(202).json({
        message: "An MFA Token has been generated for this login attempt",
      });
    }

    // Successful login
    await logSecurityEvent({
      event_type: "LOGIN_SUCCESS",
      severity: "low",
      user_id: user.user_id,
      ip_address: clientIp,
      user_agent: req.headers["user-agent"],
      resource: "/api/auth/login",
      metadata: {
        email,
      },
    });

    const token = createAccessToken(user);

    return res.status(200).json({ user, token });
  } catch (err) {
    console.error("Login error:", err);

    if (logger && logger.error) {
      logger.error("Login error", err);
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

// ================= MFA LOGIN =================
const loginMfa = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const mfa_token = req.body.mfa_token;

  let clientIp =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
  clientIp = clientIp === "::1" ? "127.0.0.1" : clientIp;

  if (!email || !password || !mfa_token) {
    return res.status(400).json({
      error: "Email, password, and token are required",
    });
  }

  try {
    const user = await getUserCredentials(email);

    if (!user) {
      await logSecurityEvent({
        event_type: "MFA_FAILED",
        severity: "medium",
        user_id: null,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login-mfa",
        metadata: {
          email,
          reason: "user_not_found",
        },
      });

      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    const validToken = await verifyMfaToken(user.user_id, mfa_token);

    if (!validPassword || !validToken) {
      await logSecurityEvent({
        event_type: "MFA_FAILED",
        severity: "medium",
        user_id: user.user_id,
        ip_address: clientIp,
        user_agent: req.headers["user-agent"],
        resource: "/api/auth/login-mfa",
        metadata: {
          email,
          reason: "invalid_password_or_mfa_token",
        },
      });

      return res.status(401).json({ error: "Invalid credentials" });
    }

    await logSecurityEvent({
      event_type: "MFA_SUCCESS",
      severity: "low",
      user_id: user.user_id,
      ip_address: clientIp,
      user_agent: req.headers["user-agent"],
      resource: "/api/auth/login-mfa",
      metadata: {
        email,
      },
    });

    const token = createAccessToken(user);

    return res.status(200).json({ user, token });
  } catch (err) {
    console.error("MFA error:", err);

    if (logger && logger.error) {
      logger.error("MFA error", err);
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { login, loginMfa };