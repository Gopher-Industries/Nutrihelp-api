const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const { supabase } = require("../database/supabase");

const safeLog = async (payload) => {
  try {
    await logLoginEvent(payload);
  } catch (e) {
    console.warn("log error:", e.message);
  }
};

const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, email, password, contact_number, address } = req.body;
  const emailNormalized = (email || "").trim().toLowerCase();

  let clientIp =
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "";
  clientIp = clientIp === "::1" ? "127.0.0.1" : clientIp;
  const userAgent = req.get("User-Agent") || "";

  try {
    // Step 1: Create user in Supabase Auth (for email verification)
    const { data, error } = await supabase.auth.signUp({
      email: emailNormalized,
      password,
      options: {
        data: {
          name,
          contact_number: contact_number || null,
          address: address || null,
        },
        emailRedirectTo: process.env.APP_ORIGIN
          ? `${process.env.APP_ORIGIN}/login`
          : undefined,
      },
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") && msg.includes("registered")) {
        await safeLog({
          userId: null,
          eventType: "EXISTING_USER",
          ip: clientIp,
          userAgent,
          details: { email: emailNormalized },
        });
        return res.status(400).json({ error: "User already exists" });
      }
      if (msg.includes("password")) {
        return res.status(400).json({ error: error.message });
      }
      return res
        .status(400)
        .json({ error: error.message || "Unable to create user" });
    }

    const authUserId = data.user?.id || null;

    if (authUserId) {
      try {
        // Step 2: Insert into profiles table (linked by Supabase UUID)
        await supabase.from("profiles").upsert(
          {
            id: authUserId, // Supabase UUID
            email: emailNormalized,
            name,
            contact_number: contact_number || null,
            address: address || null,
          },
          { onConflict: "id" }
        );

        // Step 3: Insert into users table (with hashed password + schema fields)
        const hashedPassword = await bcrypt.hash(password, 10);

        await supabase.from("users").insert([
          {
            email: emailNormalized,
            password: hashedPassword,
            name,
            contact_number: contact_number || null,
            address: address || null,
            email_verified: false, // will be updated after confirmation
            is_verified: false,
            mfa_enabled: true
          },
        ]);
      } catch (e) {
        console.warn("profiles/users insert failed:", e.message);
      }
    }

    await safeLog({
      userId: authUserId,
      eventType: "SIGNUP_SUCCESS",
      ip: clientIp,
      userAgent,
      details: { email: emailNormalized },
    });

    return res.status(201).json({
      message:
        "User created successfully. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Unexpected signup error:", err);
    await safeLog({
      userId: null,
      eventType: "SIGNUP_FAILED",
      ip: clientIp,
      userAgent,
      details: {
        reason: "Internal server error",
        error_message: err.message,
        email: emailNormalized,
      },
    });
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { signup };