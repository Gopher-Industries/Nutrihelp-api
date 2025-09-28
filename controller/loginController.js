const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const getUserCredentials = require("../model/getUserCredentials.js");
const { addMfaToken, verifyMfaToken } = require("../model/addMfaToken.js");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const supabase = require("../dbConnection");
const { validationResult } = require("express-validator");

// ✅ Initialize SendGrid API key once globally (support multiple env var names)
const _sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
if (_sendgridKey) {
  sgMail.setApiKey(_sendgridKey);
} else {
  console.warn("SendGrid API key not set (SENDGRID_API_KEY or SENDGRID_KEY). Email sending will be disabled.");
}

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
      // If developer explicitly requests the OTP be sent to client (for local testing), skip calling SendGrid
      const exposeOtpToClient = (process.env.NODE_ENV !== 'production') && (process.env.SEND_OTP_TO_CLIENT === 'true');
      console.log('DEBUG: NODE_ENV=', process.env.NODE_ENV, 'SEND_OTP_TO_CLIENT=', process.env.SEND_OTP_TO_CLIENT, 'exposeOtpToClient=', exposeOtpToClient);

      if (exposeOtpToClient) {
        // Skip sending via SendGrid to avoid 'Maximum credits exceeded' during local dev
        // Display the MFA token prominently in terminal for developer testing
        console.log('');
        console.log('🔐 ==============================================');
        console.log('📧 [DEV] MFA Token Generated for Testing:');
        console.log(`📱 Email: ${user.email}`);
        console.log(`🔢 MFA Code: ${token}`);
        console.log('🔐 ==============================================');
        console.log('');
        
        // Also expose the token in a response header so frontends can read it automatically
        res.setHeader('X-DEV-MFA-TOKEN', token);
        // Allow browsers to access this custom header
        res.setHeader('Access-Control-Expose-Headers', 'X-DEV-MFA-TOKEN');
        const responseBody = { message: "An MFA Token has been requested for your account", token };
        return res.status(202).json(responseBody);
      }

      // production/default: attempt to send via SendGrid as before
      const sendResult = await sendOtpEmail(user.email, token);

      if (!sendResult?.ok) {
        console.warn('sendOtpEmail failed', sendResult);
        const responseBody = { message: "An MFA Token has been requested for your account" };
        if (process.env.NODE_ENV !== 'production') responseBody.sendgrid = sendResult;
        return res.status(202).json(responseBody);
      }

      return res.status(202).json({ message: "An MFA Token has been sent to your email address" });
    }

    await logLoginEvent({
      userId: user.user_id,
      eventType: "LOGIN_SUCCESS",
      ip: clientIp,
      userAgent: req.headers["user-agent"]
    });

    // ✅ RBAC-aware JWT generation
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_TOKEN || process.env.JWT;
    if (!jwtSecret) {
      console.error('JWT secret is not configured. Set JWT_SECRET (or JWT_TOKEN) in your environment.');
      return res.status(500).json({ error: 'Server configuration error: missing JWT secret' });
    }

    const token = jwt.sign(
      { 
        userId: user.user_id,
        role: user.user_roles?.role_name || "unknown"
      },
      jwtSecret,
      { expiresIn: "10m" }  // 修改为10分钟
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
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_TOKEN || process.env.JWT;
    if (!jwtSecret) {
      console.error('JWT secret is not configured. Set JWT_SECRET (or JWT_TOKEN) in your environment.');
      return res.status(500).json({ error: 'Server configuration error: missing JWT secret' });
    }

    const token = jwt.sign(
      { 
        userId: user.user_id,
        role: user.user_roles?.role_name || "unknown"
      },
      jwtSecret,
      { expiresIn: "10m" }  // 修改为10分钟
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
    const from = process.env.FROM_EMAIL || process.env.SENDGRID_FROM || 'noreply@nutrihelp.com';
    if (!_sendgridKey) {
      console.warn(`Not sending OTP email to ${email} because SendGrid is not configured. OTP token: ${token}`);
      return { ok: false, reason: 'sendgrid_not_configured', token };
    }

    await sgMail.send({
      to: email,
      from,
      subject: "NutriHelp Login Token",
      text: `Your token to log in is ${token}`,
      html: `Your token to log in is <strong>${token}</strong>`
    });
    console.log("OTP email sent successfully to", email);
    return { ok: true };
  } catch (err) {
    const errBody = err.response?.body || err.message;
    console.error("Error sending OTP email:", errBody);
    // If SendGrid returns an error like 'Maximum credits exceeded', surface that to caller
    return { ok: false, reason: 'sendgrid_error', detail: errBody };
  }
}

// ✅ Send failed login alert via SendGrid
async function sendFailedLoginAlert(email, ip) {
  try {
    const from = process.env.FROM_EMAIL || process.env.SENDGRID_FROM || 'noreply@nutrihelp.com';
    if (!_sendgridKey) {
      console.warn(`Not sending failed-login alert to ${email} because SendGrid is not configured. IP: ${ip}`);
      return;
    }

    await sgMail.send({
      from,
      to: email,
      subject: "Failed Login Attempt on NutriHelp",
      text: `Hi,\n\nSomeone tried to log in to NutriHelp using your email address from IP: ${ip}.\n\nIf this wasn't you, please ignore this message. But if you're concerned, consider resetting your password or contacting support.\n\n– NutriHelp Security Team`
    });
    console.log(`Failed login alert sent to ${email}`);
  } catch (err) {
    console.error("Failed to send alert email:", err.response?.body || err.message);
  }
}

module.exports = { login, loginMfa };