const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const getUserCredentials = require("../model/getUserCredentials.js");
const {
  addMfaToken,
  invalidateMfaTokens,
  verifyMfaToken,
} = require("../model/addMfaToken.js");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const supabase = require("../dbConnection");
const { validationResult } = require("express-validator");

// Nodemailer transporter using Gmail no-reply account
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

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
    const userExists = user !== null && user !== undefined;

    if (!userExists) {
      await supabase.from("brute_force_logs").insert([{
        email,
        ip_address: clientIp,
        success: false,
        created_at: new Date().toISOString()
      }]);
      await sendFailedLoginAlert(email, clientIp);
      return res.status(404).json({
        error: "Account not found. Please create an account first."
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
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

      await sendFailedLoginAlert(email, clientIp);
      return res.status(401).json({ error: "Invalid password" });
    }

    // Log successful login attempt and clear failures
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
    if (!user) {
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

// Send OTP email via Nodemailer
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
      text: `Your one-time login token is: ${token}\n\nThis token expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n– NutriHelp Security Team`,
      html: `
        <p>Your one-time login token is:</p>
        <h2>${token}</h2>
        <p>This token expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br/>
        <p>– NutriHelp Security Team</p>
      `
    });
    console.log("✅ OTP email sent successfully to", email);
  } catch (err) {
    console.error("Error sending OTP email:", err.message);
  }
}

const resendMfa = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const email = req.body.email?.trim().toLowerCase();

  try {
    const user = await getUserCredentials(email);

    if (!user || !user.mfa_enabled) {
      return res.status(404).json({
        success: false,
        error: "MFA is not enabled for this account",
      });
    }

    await invalidateMfaTokens(user.user_id);

    const token = crypto.randomInt(100000, 999999);
    await addMfaToken(user.user_id, token);
    await sendOtpEmail(user.email, token);

    return res.status(200).json({
      success: true,
      message: "A new MFA token has been sent to your email address",
    });
  } catch (err) {
    console.error("MFA resend error:", err);
    return res.status(500).json({
      success: false,
      error: "Unable to resend MFA token",
    });
  }
};

// Send failed login alert via Nodemailer
async function sendFailedLoginAlert(email, ip) {
  try {
    await transporter.sendMail({
      from: `"NutriHelp Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Failed Login Attempt on NutriHelp",
      text: `Hi,\n\nSomeone tried to log in to NutriHelp using your email address from IP: ${ip}.\n\nIf this wasn't you, please ignore this message. If you're concerned, consider resetting your password or contacting support.\n\n– NutriHelp Security Team`,
      html: `
        <p>Hi,</p>
        <p>Someone tried to log in to <strong>NutriHelp</strong> using your email address from IP: <code>${ip}</code>.</p>
        <p>If this wasn't you, please ignore this message. If you're concerned, consider resetting your password or contacting support.</p>
        <br/>
        <p>– NutriHelp Security Team</p>
      `
    });
    console.log(`✅ Failed login alert sent to ${email}`);
  } catch (err) {
    console.error("Failed to send alert email:", err.message);
  }
}

module.exports = { login, loginMfa, resendMfa };
