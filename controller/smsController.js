// controller/smsController.js

/**
 * SMS Controller (temporary console-output mode)
 * ---------------------------------------------------------
 * - Queries user's phone number from Supabase by email
 * - Generates a 6-digit verification code
 * - TEMP behavior: prints the code to server console and returns it in JSON for testing
 * - ORIGINAL Twilio sending code is preserved but commented out for future re-enable
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
// NOTE: Twilio is still imported for future use (even though sending is disabled for now)
const twilio = require("twilio");

// --- Supabase client ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// --- Twilio client (kept for future real SMS sending) ---
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || "",
  process.env.TWILIO_AUTH_TOKEN || ""
);

// Utility: generate 6-digit numeric token as string (e.g., "483920")
function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/sms/send-sms-code
 * Body: { email: string }
 *
 * Behavior (CURRENT):
 *   - Looks up phone by email
 *   - Generates a code and PRINTS it to the console
 *   - Responds with { message, phone, debugCode } for dev testing
 *
 * To RE-ENABLE real SMS later:
 *   1) Fill valid TWILIO_* env variables
 *   2) Uncomment the "Twilio send" block below
 *   3) (Optional) remove debugCode from response
 */
exports.sendSMSCode = async (req, res) => {
  const { email } = req.body;

  // Basic validation
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    // 1) Look up user's phone number from Supabase by email
    //    Table and column names are based on your screenshot: table 'users', phone column 'contact_number'
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("contact_number")
      .eq("email", email)
      .single();

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return res.status(500).json({ error: "Failed to query user phone number." });
    }

    if (!data || !data.contact_number) {
      return res.status(404).json({ error: "Phone number not found for the given email." });
    }

    const phone = data.contact_number;

    // 2) Generate a 6-digit verification code
    const code = generate6DigitCode();

    // 3) TEMP MODE: Output to console instead of sending SMS
    console.log("=======================================");
    console.log("📱 MFA Verification (TEMP MODE)");
    console.log("Email:", email);
    console.log("Phone:", phone);
    console.log("Verification Code:", code);
    console.log("Timestamp:", new Date().toISOString());
    console.log("=======================================");

    // 4) (ORIGINAL) Twilio real SMS sending — preserved but disabled.
    //    To re-enable, ensure env vars are valid, then uncomment this block.
    /*
    try {
      // IMPORTANT: TWILIO_PHONE_NUMBER must be a valid Twilio number you own
      await twilioClient.messages.create({
        body: `Your verification code is: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER, // e.g. "+1415xxxxxxx"
        to: phone, // user's phone from DB (must include country code, e.g., +61...)
      });
    } catch (twilioErr) {
      console.error("❌ Twilio sending error:", twilioErr);
      return res.status(502).json({ error: "Failed to send SMS via provider." });
    }
    */

    // 5) TODO (recommended for production):
    //    - Store the code with expiration (e.g., in DB table 'verification_codes' or Redis)
    //    - Rate-limit requests per email/phone
    //    - Do NOT return code in response in production

    return res.status(200).json({
      message: "Verification code generated (printed to console).",
      phone,
      debugCode: code, // For dev/testing only. Remove in production.
    });
  } catch (err) {
    console.error("❌ sendSMSCode internal error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * (Optional) Stub for verification endpoint — keep for future use
 * POST /api/sms/verify-sms-code
 * Body: { email: string, code: string }
 *
 * Outline:
 *   - Fetch the last generated code for this user/phone from your store
 *   - Compare with the provided 'code'
 *   - Check expiry window (e.g., 5 minutes)
 *   - Mark user/session as MFA-verified
 */
// exports.verifySMSCode = async (req, res) => {
//   const { email, code } = req.body;
//   if (!email || !code) {
//     return res.status(400).json({ error: "Email and code are required." });
//   }
//   // TODO: implement verification logic against stored code
//   return res.status(200).json({ message: "Verified (stub)." });
// };
