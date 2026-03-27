const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const userRepository = require('../repositories/userRepository');
const authIdentityRepository = require('../repositories/authIdentityRepository');

const safeLog = async (payload) => {
  try { await logLoginEvent(payload); } catch (e) { console.warn("[signupController] Security event log failed:", e.message); }
};
const isStrongPassword = (pw) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pw || "");

const signup = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, contact_number, address } = req.body;
  const emailNormalized = (email || "").trim().toLowerCase();

if (!isStrongPassword(password)) {
    return res.status(400).json({
      code: "WEAK_PASSWORD",
      error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    });
  }
  
  let clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "";
  clientIp = clientIp === "::1" ? "127.0.0.1" : clientIp;
  const userAgent = req.get("User-Agent") || "";

  try {
    const authTableResult = await signupAuthTable(name, emailNormalized, password, contact_number, address, clientIp, userAgent);
    // If not success
    if (!authTableResult.success) {
      return res.status(authTableResult.status).json(authTableResult.result);
    }

    const publicTableResult = await signupPublicTable(authTableResult.result.user_uuid,
      name, emailNormalized, password, contact_number, address, clientIp, userAgent);
    // If not success
    if (!publicTableResult.success) {
      return res.status(publicTableResult.status).json(publicTableResult.result);
    }

    // Signup successfully
    return res.status(201).json({
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('[signupController] User creation failed:', error);
    await safeLog({
      userId: null,
      eventType: 'SIGNUP_FAILED',
      ip: clientIp,
      userAgent,
      details: {
        reason: 'Internal server error',
        error_message: error.message,
        email: emailNormalized
      }
    });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Add data to public.users table
const signupPublicTable = async (user_uuid, name, emailNormalized, password, contact_number, address, clientIp, userAgent) => {
  const userExists = await userRepository.findByEmail(emailNormalized);
  if (userExists) {
    // Log signup failure due to duplicate
    await safeLog({
      userId: null,
      eventType: 'EXISTING_USER',
      ip: clientIp,
      userAgent,
      details: {
        reason: 'User already exists',
        email: emailNormalized
      }
    });

    return {
      success: false,
      status: 400,
      result: { error: 'User already exists' }
    }
    // return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await userRepository.createUser({
    name,
    email: emailNormalized,
    password: hashedPassword,
    mfaEnabled: true,
    contactNumber: contact_number,
    address
  });

  await safeLog({
    // userId: result.user_id,
    userId: user_uuid,
    eventType: 'SIGNUP_SUCCESS',
    ip: clientIp,
    userAgent,
    details: { email: emailNormalized }
  });

  return {
    success: true,
    status: 201,
    result: { message: 'User created successfully' }
  }
  // return res.status(201).json({ message: 'User created successfully' });
}

// Add data to auth.users table
const signupAuthTable = async (name, emailNormalized, password, contact_number, address, clientIp, userAgent) => {
  let data;
  try {
    data = await authIdentityRepository.signUp({
      email: emailNormalized,
      password,
      options: {
        data: { name, contact_number: contact_number || null, address: address || null },
        emailRedirectTo: process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/login` : undefined,
      },
    });
  } catch (error) {
    const msg = (error.message || "").toLowerCase();

    if (msg.includes("already") && msg.includes("registered")) {
      await safeLog({
        userId: null, eventType: "EXISTING_USER", ip: clientIp, userAgent,
        details: { email: emailNormalized }
      });
      return {
        success: false,
        status: 400,
        result: { error: "User already exists" }
      };
    }
    if (msg.includes("password")) {
      return {
        success: false,
        status: 400,
        result: { error: error.message }
      };
    }

    return {
      success: false,
      status: 400,
      result: { error: error.message || "Unable to create user" }
    };
  }

  // FORCE LOGOUT AFTER SIGNUP (VERY IMPORTANT)
  if (data?.session) {
    await authIdentityRepository.signOut();
  }

  const userId = data.user?.id || null;

  if (data.session?.access_token) {
    try {
      await authIdentityRepository.upsertProfileWithAccessToken(
        data.session.access_token,
        {
          id: userId,
          email: emailNormalized,
          name,
          contact_number: contact_number || null,
          address: address || null,
        },
      );
    } catch (e) {
      console.warn("[signupController] Profile upsert failed:", e.message);

    }
  }

  return {
    success: true,
    status: 201,
    result: {
      user_uuid: userId,
      message: "User created successfully. Please check your email to verify your account.",
    }
  }
  // return res.status(201).json({
  //   message: "User created successfully. Please check your email to verify your account.",
  // });
}

module.exports = { signup };
