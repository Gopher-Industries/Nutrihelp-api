require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const twilio = require("twilio");
const sendWithRetry = require("../utils/auditSender"); // ✅ ADD THIS

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || "",
  process.env.TWILIO_AUTH_TOKEN || ""
);

// --- Switch for Twilio sending (default false in dev) ---
const USE_TWILIO = process.env.USE_TWILIO === "true";

// In-memory store for verification codes (DEV only)
const codeStore = new Map();
const CODE_TTL_MIN = 5;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function expireAt(minutes = CODE_TTL_MIN) {
  return Date.now() + minutes * 60 * 1000;
}

/**
 * SEND SMS CODE
 */
exports.sendSMSCode = async (req, res) => {
  const { email } = req.body || {};

  try {
    if (!email) {
      req.auditData.status = "fail";
      req.auditData.errorType = "VALIDATION_ERROR";
      req.auditData.fields = ["email"];
      sendWithRetry(req.auditData);

      return res.status(400).json({ error: "Email is required." });
    }

    const { data, error } = await supabase
      .from("users")
      .select("contact_number")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Supabase error:", error);

      req.auditData.status = "fail";
      req.auditData.errorType = "DATABASE_ERROR";
      sendWithRetry(req.auditData);

      return res.status(500).json({ error: "Failed to query phone number." });
    }

    if (!data || !data.contact_number) {
      req.auditData.status = "fail";
      req.auditData.errorType = "NOT_FOUND";
      sendWithRetry(req.auditData);

      return res.status(404).json({ error: "Phone number not found." });
    }

    const phone = data.contact_number;
    const code = generateCode();

    console.log("=======================================");
    console.log("📱 MFA Verification (DEV MODE)");
    console.log("Email:", email);
    console.log("Phone:", phone);
    console.log("Verification Code:", code);
    console.log("Timestamp:", new Date().toISOString());
    console.log("=======================================");

    codeStore.set(email, {
      code,
      expireAt: expireAt(CODE_TTL_MIN),
      attempts: 0
    });

    if (USE_TWILIO) {
      try {
        await twilioClient.messages.create({
          body: `Your verification code is: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        });
      } catch (twilioErr) {
        console.error("Twilio send error:", twilioErr);

        req.auditData.status = "fail";
        req.auditData.errorType = "SMS_ERROR";
        sendWithRetry(req.auditData);

        return res.status(502).json({ error: "Failed to send SMS." });
      }
    }

    req.auditData.status = "success";
    sendWithRetry(req.auditData);

    const maskedPhone = phone.replace(/(\d{2,3})\d+(\d{2})$/, "$1****$2");

    return res.status(200).json({
      ok: true,
      message: USE_TWILIO
        ? "SMS code sent."
        : "Verification code generated (check backend console in dev).",
      phone: maskedPhone,
    });

  } catch (e) {
    console.error("sendSMSCode internal error:", e);

    req.auditData.status = "fail";
    req.auditData.errorType = "SERVER_ERROR";
    sendWithRetry(req.auditData);

    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * VERIFY SMS CODE
 */
exports.verifySMSCode = async (req, res) => {
  const { email, code } = req.body || {};

  try {
    if (!email || !code) {
      req.auditData.status = "fail";
      req.auditData.errorType = "VALIDATION_ERROR";
      req.auditData.fields = ["email", "code"];
      sendWithRetry(req.auditData);

      return res.status(400).json({ error: "Email and code are required." });
    }

    const saved = codeStore.get(email);

    if (!saved) {
      req.auditData.status = "fail";
      req.auditData.errorType = "NOT_FOUND";
      sendWithRetry(req.auditData);

      return res.status(404).json({ error: "No code found." });
    }

    if (Date.now() > saved.expireAt) {
      codeStore.delete(email);

      req.auditData.status = "fail";
      req.auditData.errorType = "EXPIRED";
      sendWithRetry(req.auditData);

      return res.status(410).json({ error: "Code expired." });
    }

    if (String(code).trim() !== saved.code) {
      saved.attempts += 1;

      req.auditData.status = "fail";
      req.auditData.errorType = "INVALID_CODE";
      sendWithRetry(req.auditData);

      if (saved.attempts >= MAX_ATTEMPTS) {
        codeStore.delete(email);
        return res.status(429).json({ error: "Too many attempts." });
      }

      return res.status(401).json({ error: "Invalid code." });
    }

    codeStore.delete(email);

    req.auditData.status = "success";
    sendWithRetry(req.auditData);

    return res.status(200).json({
      ok: true,
      message: "SMS verification successful."
    });

  } catch (err) {
    console.error("verifySMSCode error:", err);

    req.auditData.status = "fail";
    req.auditData.errorType = "SERVER_ERROR";
    sendWithRetry(req.auditData);

    return res.status(500).json({ error: "Internal server error." });
  }
};