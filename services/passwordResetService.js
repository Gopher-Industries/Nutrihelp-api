const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const supabase = require("../dbConnection");
const { ServiceError } = require("./serviceError");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const fallbackStore = [];

function nowIso() {
  return new Date().toISOString();
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function randomCode() {
  return String(crypto.randomInt(100000, 999999));
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function isMissingTable(error) {
  const message = error?.message || "";
  return (
    error?.status === 404 ||
    error?.code === "42P01" ||
    error?.statusText === "Not Found" ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("password_reset_tokens")
  );
}

function throwSupabaseError(response) {
  const error = response?.error || {};
  error.status = response?.status;
  error.statusText = response?.statusText;
  throw error;
}

async function invalidateSupabaseTokens(email) {
  const response = await supabase
    .from("password_reset_tokens")
    .update({ is_active: false })
    .eq("email", email)
    .eq("is_active", true);

  if (response.error) {
    throwSupabaseError(response);
  }
}

function invalidateFallbackTokens(email) {
  for (const item of fallbackStore) {
    if (item.email === email && item.is_active) {
      item.is_active = false;
    }
  }
}

async function createSupabaseToken(record) {
  const response = await supabase.from("password_reset_tokens").insert(record);
  if (response.error) {
    throwSupabaseError(response);
  }
}

function createFallbackToken(record) {
  fallbackStore.push({
    id: `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...record,
  });
}

async function storeResetRecord(record) {
  try {
    await invalidateSupabaseTokens(record.email);
    await createSupabaseToken(record);
    return "supabase";
  } catch (error) {
    if (!isMissingTable(error)) {
      throw error;
    }
  }

  invalidateFallbackTokens(record.email);
  createFallbackToken(record);
  return "memory";
}

async function findSupabaseCodeRecord(email, codeHash) {
  const response = await supabase
    .from("password_reset_tokens")
    .select("id, email, code_hash, reset_token_hash, expires_at, verified_at, is_active")
    .eq("email", email)
    .eq("code_hash", codeHash)
    .eq("is_active", true)
    .order("expires_at", { ascending: false })
    .limit(1);

  if (response.error) {
    throwSupabaseError(response);
  }

  return Array.isArray(response.data) ? response.data[0] || null : null;
}

function findFallbackCodeRecord(email, codeHash) {
  return (
    [...fallbackStore]
      .reverse()
      .find(
        (item) =>
          item.email === email &&
          item.code_hash === codeHash &&
          item.is_active === true,
      ) || null
  );
}

async function markSupabaseCodeVerified(id, resetTokenHash) {
  const response = await supabase
    .from("password_reset_tokens")
    .update({
      verified_at: nowIso(),
      reset_token_hash: resetTokenHash,
    })
    .eq("id", id);

  if (response.error) {
    throwSupabaseError(response);
  }
}

function markFallbackCodeVerified(id, resetTokenHash) {
  const record = fallbackStore.find((item) => item.id === id);
  if (record) {
    record.verified_at = nowIso();
    record.reset_token_hash = resetTokenHash;
  }
}

async function findSupabaseTokenRecord(email, resetTokenHash) {
  const response = await supabase
    .from("password_reset_tokens")
    .select("id, email, reset_token_hash, expires_at, verified_at, is_active")
    .eq("email", email)
    .eq("reset_token_hash", resetTokenHash)
    .eq("is_active", true)
    .order("expires_at", { ascending: false })
    .limit(1);

  if (response.error) {
    throwSupabaseError(response);
  }

  return Array.isArray(response.data) ? response.data[0] || null : null;
}

function findFallbackTokenRecord(email, resetTokenHash) {
  return (
    [...fallbackStore]
      .reverse()
      .find(
        (item) =>
          item.email === email &&
          item.reset_token_hash === resetTokenHash &&
          item.is_active === true,
      ) || null
  );
}

async function deactivateSupabaseRecord(id) {
  const response = await supabase
    .from("password_reset_tokens")
    .update({ is_active: false })
    .eq("id", id);

  if (response.error) {
    throwSupabaseError(response);
  }
}

function deactivateFallbackRecord(id) {
  const record = fallbackStore.find((item) => item.id === id);
  if (record) {
    record.is_active = false;
  }
}

async function withStorageFallback(primaryFn, fallbackFn) {
  try {
    return await primaryFn();
  } catch (error) {
    if (!isMissingTable(error)) {
      throw error;
    }
    return fallbackFn();
  }
}

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, email, name")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

async function updatePassword(userId, hashedPassword) {
  const { error } = await supabase
    .from("users")
    .update({ password: hashedPassword })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function sendResetEmail(email, code) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`📨 [DEV] Password reset code for ${email}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `"NutriHelp Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "NutriHelp password reset code",
    text:
      `Your NutriHelp password reset code is ${code}.\n\n` +
      "It expires in 10 minutes.\n\n" +
      "If you did not request this, you can safely ignore this email.",
    html:
      `<p>Your NutriHelp password reset code is:</p><h2>${code}</h2>` +
      "<p>This code expires in <strong>10 minutes</strong>.</p>" +
      "<p>If you did not request this, you can safely ignore this email.</p>",
  });
}

class PasswordResetService {
  async requestReset(email, deviceInfo = {}) {
    if (!email) {
      throw new ServiceError(400, "Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return {
        success: true,
        message: "If that email exists, a verification code was sent.",
      };
    }

    const code = randomCode();
    const record = {
      email: normalizedEmail,
      // Email is the authoritative lookup key for reset flows in this app.
      // The public.users identifier is numeric in some environments, while the
      // reset-token table may be provisioned with a UUID column on remote.
      // Storing null here keeps the flow consistent until schemas are unified.
      user_id: null,
      code_hash: hashValue(code),
      reset_token_hash: null,
      expires_at: new Date(Date.now() + RESET_CODE_TTL_MS).toISOString(),
      requested_from_ip: deviceInfo.ip || null,
      requested_user_agent: deviceInfo.userAgent || null,
      verified_at: null,
      is_active: true,
      created_at: nowIso(),
    };

    await storeResetRecord(record);
    await sendResetEmail(normalizedEmail, code);

    return {
      success: true,
      message: "If that email exists, a verification code was sent.",
    };
  }

  async verifyCode(email, code) {
    if (!email || !code) {
      throw new ServiceError(400, "Email and verification code are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const codeHash = hashValue(code);
    const record = await withStorageFallback(
      () => findSupabaseCodeRecord(normalizedEmail, codeHash),
      () => findFallbackCodeRecord(normalizedEmail, codeHash),
    );

    if (!record) {
      throw new ServiceError(401, "Verification code is invalid or has expired");
    }

    if (new Date(record.expires_at) < new Date()) {
      throw new ServiceError(401, "Verification code is invalid or has expired");
    }

    const resetToken = randomToken();
    const resetTokenHash = hashValue(resetToken);

    await withStorageFallback(
      () => markSupabaseCodeVerified(record.id, resetTokenHash),
      () => markFallbackCodeVerified(record.id, resetTokenHash),
    );

    return {
      success: true,
      message: "Verification code accepted.",
      resetToken,
      expiresIn: Math.floor(RESET_TOKEN_TTL_MS / 1000),
    };
  }

  async resetPassword({ email, resetToken, code, newPassword }) {
    if (!email || !newPassword) {
      throw new ServiceError(400, "Email and new password are required");
    }

    let effectiveResetToken = resetToken;

    if (!effectiveResetToken && code) {
      const verification = await this.verifyCode(email, code);
      effectiveResetToken = verification.resetToken;
    }

    if (!effectiveResetToken) {
      throw new ServiceError(400, "Reset token is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resetTokenHash = hashValue(effectiveResetToken);
    const record = await withStorageFallback(
      () => findSupabaseTokenRecord(normalizedEmail, resetTokenHash),
      () => findFallbackTokenRecord(normalizedEmail, resetTokenHash),
    );

    if (!record || !record.verified_at) {
      throw new ServiceError(401, "Reset token is invalid or has expired");
    }

    if (new Date(record.expires_at) < new Date()) {
      throw new ServiceError(401, "Reset token is invalid or has expired");
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      throw new ServiceError(404, "Account not found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await updatePassword(user.user_id, hashedPassword);

    await withStorageFallback(
      () => deactivateSupabaseRecord(record.id),
      () => deactivateFallbackRecord(record.id),
    );

    return {
      success: true,
      message: "Password updated successfully.",
    };
  }
}

module.exports = new PasswordResetService();
