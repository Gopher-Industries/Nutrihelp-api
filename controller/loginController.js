const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const getUserCredentials = require("../model/getUserCredentials.js");
const { addMfaToken, verifyMfaToken } = require("../model/addMfaToken.js");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const supabase = require("../dbConnection");
const { validationResult } = require("express-validator");

// ✅ Set SendGrid API key once globally
sgMail.setApiKey(process.env.SENDGRID_KEY);

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  let clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
  clientIp = clientIp === "::1" ? "127.0.0.1" : clientIp;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const tenMinutesAgoISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  try {
    // Count failed login attempts
    const { data: failuresByEmail } = await supabase
      .from("brute_force_logs")
      .select("id")
      .eq("email", email)
      .eq("success", false)
      .gte("created_at", tenMinutesAgoISO);

    const failureCount = failuresByEmail?.length || 0;

    if (failureCount >= 10) {
      return res.status(429).json({
        error: "❌ Too many failed login attempts. Please try again after 10 minutes."
      });
    }

    // Validate credentials
    const user = await getUserCredentials(email);
    const userExists = user && user.length !== 0;
    const isPasswordValid = userExists ? await bcrypt.compare(password, user.password) : false;
    const isLoginValid = userExists && isPasswordValid;

    if (!isLoginValid) {
      await supabase.from("brute_force_logs").insert([{
        email,
        ip_address: clientIp,
        success: false,
        created_at: new Date().toISOString()
      }]);

      if (failureCount === 4) {
        return res.status(429).json({
          warning: "⚠ You have one attempt left before your account is temporarily locked."
        });
      }

      if (!userExists || !isPasswordValid) {
        await sendFailedLoginAlert(email, clientIp);

        if (!userExists) {
          return res.status(401).json({ error: "Invalid email" });
        }

        return res.status(401).json({ error: "Invalid password" });
      }
    }

    // Log successful login attempt
    await supabase.from("brute_force_logs").insert([{
      email,
      success: true,
      created_at: new Date().toISOString()
    }]);

    await supabase.from("brute_force_logs").delete()
      .eq("email", email)
      .eq("success", false);

    // MFA handling
    if (user.mfa_enabled) {
      const token = crypto.randomInt(100000, 999999);
      await addMfaToken(user.user_id, token);
      await sendOtpEmail(user.email, token);
      return res.status(202).json({
        message: "An MFA Token has been sent to your email address"
      });
    }

    await logLoginEvent({
      userId: user.user_id,
      eventType: "LOGIN_SUCCESS",
      ip: clientIp,
      userAgent: req.headers["user-agent"]
    });

    // ✅ RBAC-aware JWT generation
    const token = jwt.sign(
      { 
        userId: user.user_id,
        role: user.user_roles?.role_name || "unknown"
      },
      process.env.JWT_TOKEN,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ user, token });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const loginMfa = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const mfa_token = req.body.mfa_token;

  if (!email || !password || !mfa_token) {
    return res.status(400).json({ error: "Email, password, and token are required" });
  }

  try {
    const user = await getUserCredentials(email);
    if (!user || user.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const tokenValid = await verifyMfaToken(user.user_id, mfa_token);
    if (!tokenValid) {
      return res.status(401).json({ error: "Token is invalid or has expired" });
    }

    // ✅ RBAC-aware JWT
    const token = jwt.sign(
      { 
        userId: user.user_id,
        role: user.user_roles?.role_name || "unknown"
      },
      process.env.JWT_TOKEN,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ user, token });

  } catch (err) {
    console.error("MFA login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Send OTP email via SendGrid
async function sendOtpEmail(email, token) {
  try {
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM,
      subject: "NutriHelp Login Token",
      text: `Your token to log in is ${token}`,
      html: `Your token to log in is <strong>${token}</strong>`
    });
    console.log("OTP email sent successfully to", email);
  } catch (err) {
    console.error("Error sending OTP email:", err.response?.body || err.message);
  }
}

// ✅ Send failed login alert via SendGrid
async function sendFailedLoginAlert(email, ip) {
  try {
    await sgMail.send({
      from: process.env.SENDGRID_FROM,
      to: email,
      subject: "Failed Login Attempt on NutriHelp",
      text: `Hi,

Someone tried to log in to NutriHelp using your email address from IP: ${ip}.

If this wasn't you, please ignore this message. But if you're concerned, consider resetting your password or contacting support.

– NutriHelp Security Team`
    });
    console.log(`Failed login alert sent to ${email}`);
  } catch (err) {
    console.error("Failed to send alert email:", err.response?.body || err.message);
  }
}

module.exports = { login, loginMfa };