const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const supabase = require("../dbConnection");

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const resetCodeStore = new Map();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const jsonError = (res, status, error, code) =>
  res.status(status).json({ error, message: error, code });

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const generateCode = () => crypto.randomInt(100000, 999999).toString();

const getStoredReset = (email) => resetCodeStore.get(normalizeEmail(email));

const setStoredReset = (email, code) => {
  resetCodeStore.set(normalizeEmail(email), {
    code,
    attempts: 0,
    verified: false,
    expireAt: Date.now() + RESET_CODE_TTL_MS,
  });
};

const clearStoredReset = (email) => {
  resetCodeStore.delete(normalizeEmail(email));
};

const sendResetCodeEmail = async (email, code) => {
  await transporter.sendMail({
    from: `"NutriHelp Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "NutriHelp Password Reset Code",
    text:
      `Your password reset code is: ${code}\n\n` +
      "This code expires in 10 minutes.\n\n" +
      "If you did not request this, please ignore this email.\n\n" +
      "– NutriHelp Security Team",
    html: `
      <p>Your password reset code is:</p>
      <h2>${code}</h2>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>– NutriHelp Security Team</p>
    `,
  });
};

const validateStrongPassword = (password) => {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(value)) return "Password must contain at least one number";
  if (!/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(value)) {
    return "Password must contain at least one special character";
  }
  return null;
};

const getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, email, password")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

const requestReset = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return jsonError(res, 400, "Email is required", "EMAIL_REQUIRED");
  }

  try {
    const user = await getUserByEmail(email);
    if (user) {
      const code = generateCode();
      setStoredReset(email, code);
      await sendResetCodeEmail(email, code);
    }

    return res.status(200).json({
      ok: true,
      message: "If that email exists, a code was sent. Check your inbox.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return jsonError(res, 500, "Internal server error", "INTERNAL_SERVER_ERROR");
  }
};

const verifyCode = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();

  if (!email || !code) {
    return jsonError(res, 400, "Email and code are required", "EMAIL_CODE_REQUIRED");
  }

  const stored = getStoredReset(email);
  if (!stored) {
    return jsonError(res, 404, "No reset code requested or code expired", "RESET_CODE_NOT_FOUND");
  }

  if (Date.now() > stored.expireAt) {
    clearStoredReset(email);
    return jsonError(res, 410, "Code expired. Please request a new one.", "RESET_CODE_EXPIRED");
  }

  if (stored.code !== code) {
    stored.attempts += 1;
    if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
      clearStoredReset(email);
      return jsonError(res, 429, "Too many attempts. Request a new code.", "RESET_CODE_LOCKED");
    }
    resetCodeStore.set(email, stored);
    return jsonError(res, 401, "Invalid code", "RESET_CODE_INVALID");
  }

  stored.verified = true;
  resetCodeStore.set(email, stored);

  return res.status(200).json({
    ok: true,
    message: "Verification successful",
    verified: true,
  });
};

const resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  const newPassword = req.body?.newPassword || req.body?.new_password;

  if (!email || !code || !newPassword) {
    return jsonError(
      res,
      400,
      "Email, code, and new password are required",
      "RESET_FIELDS_REQUIRED"
    );
  }

  const strengthError = validateStrongPassword(newPassword);
  if (strengthError) {
    return jsonError(res, 400, strengthError, "WEAK_PASSWORD");
  }

  const stored = getStoredReset(email);
  if (!stored) {
    return jsonError(res, 404, "No reset code requested or code expired", "RESET_CODE_NOT_FOUND");
  }

  if (Date.now() > stored.expireAt) {
    clearStoredReset(email);
    return jsonError(res, 410, "Code expired. Please request a new one.", "RESET_CODE_EXPIRED");
  }

  if (stored.code !== code) {
    return jsonError(res, 401, "Invalid code", "RESET_CODE_INVALID");
  }

  if (!stored.verified) {
    return jsonError(res, 400, "Please verify your code before resetting password", "RESET_CODE_NOT_VERIFIED");
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      clearStoredReset(email);
      return jsonError(res, 404, "User not found", "USER_NOT_FOUND");
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("user_id", user.user_id);

    if (error) throw error;

    clearStoredReset(email);

    return res.status(200).json({
      ok: true,
      message: "Password updated successfully",
      code: "PASSWORD_UPDATED",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return jsonError(res, 500, "Internal server error", "INTERNAL_SERVER_ERROR");
  }
};

module.exports = {
  requestReset,
  verifyCode,
  resetPassword,
};
