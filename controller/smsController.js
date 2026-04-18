require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const twilio = require("twilio");

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
const codeStore = new Map(); // email -> { code, expireAt, attempts }
const CODE_TTL_MIN = 5; // expire after 5 minutes
const MAX_ATTEMPTS = 5;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function expireAt(minutes = CODE_TTL_MIN) {
  return Date.now() + minutes * 60 * 1000;
}

/**
 * POST /api/sms/send-sms-code
 * Body: { email }
 */
exports.sendSMSCode = async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    // 1) Lookup user's phone number
    const { data, error } = await supabase
      .from("users")
      .select("contact_number")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Failed to query phone number." });
    }
    if (!data || !data.contact_number) {
      return res.status(404).json({ error: "Phone number not found for this email." });
    }

    const phone = data.contact_number;
    const code = generateCode();

    // 2) Always log in backend console for DEV/debug
    console.log("=======================================");
    console.log("📱 MFA Verification (DEV MODE)");
    console.log("Email:", email);
    console.log("Phone:", phone);
    console.log("Verification Code:", code);
    console.log("Timestamp:", new Date().toISOString());
    console.log("=======================================");

    // 3) Save code in memory
    codeStore.set(email, { code, expireAt: expireAt(CODE_TTL_MIN), attempts: 0 });

    // 4) Optionally send SMS if USE_TWILIO=true
    if (USE_TWILIO) {
      try {
        await twilioClient.messages.create({
          body: `Your verification code is: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone, // must include country code, e.g. +61...
        });
      } catch (twilioErr) {
        console.error("Twilio send error:", twilioErr);
        return res.status(502).json({ error: "Failed to send SMS via Twilio." });
      }
    }

    // Mask phone for UI
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
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * POST /api/sms/verify-sms-code
 * Body: { email, code }
 */
exports.verifySMSCode = async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  const saved = codeStore.get(email);
  if (!saved) {
    return res.status(404).json({ error: "No code requested or code expired." });
  }

  if (Date.now() > saved.expireAt) {
    codeStore.delete(email);
    return res.status(410).json({ error: "Code expired. Please request a new one." });
  }

  if (String(code).trim() !== saved.code) {
    saved.attempts += 1;
    if (saved.attempts >= MAX_ATTEMPTS) {
      codeStore.delete(email);
      return res.status(429).json({ error: "Too many attempts. Request a new code." });
    }
    codeStore.set(email, saved);
    return res.status(401).json({ error: "Invalid code." });
  }

  // Success: one-time use
  codeStore.delete(email);
  return res.status(200).json({ ok: true, message: "SMS verification successful." });
};
