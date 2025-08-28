const bcrypt = require('bcryptjs');
let getUser = require('../model/getUser.js');
let addUser = require('../model/addUser.js');
const { validationResult } = require('express-validator');
const { registerValidation } = require('../validators/signupValidator.js');
// const supabase = require('../dbConnection');
const logLoginEvent = require("../Monitor_&_Logging/loginLogger");
const { supabase } = require("../database/supabase"); 

const safeLog = async (payload) => {
  try { await logLoginEvent(payload); } catch (e) { console.warn("log error:", e.message); }
};

const signup = async (req, res) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, contact_number, address } = req.body;
  const emailNormalized = (email || "").trim().toLowerCase();

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
    console.error('Error creating user: ', error);
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
  const userExists = await getUser(emailNormalized);
    if (userExists.length > 0) {
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
    const result = await addUser(name, emailNormalized, hashedPassword, true, contact_number, address);
    const user_id = result.user_id; // UserID in int8 type (public table)
    
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
  const { data, error } = await supabase.auth.signUp({
    email: emailNormalized,
    password,
    options: {
      data: { name, contact_number: contact_number || null, address: address || null },
      
      emailRedirectTo: process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/login` : undefined,
    },
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();

    if (msg.includes("already") && msg.includes("registered")) {
      await safeLog({ userId: null, eventType: "EXISTING_USER", ip: clientIp, userAgent,
        details: { email: emailNormalized }});
      return {
        success: false,
        status: 400,
        result: { error: "User already exists" }
      } 
      // res.status(400).json({ error: "User already exists" });
    }
    if (msg.includes("password")) {
      return {
        success: false,
        status: 400,
        result: { error: error.message }
      } 
      // return res.status(400).json({ error: error.message });
    }
  
    return {
      success: false,
      status: 400,
      result: { error: error.message || "Unable to create user" }
    } 
    // return res.status(400).json({ error: error.message || "Unable to create user" });
  }

  const userId = data.user?.id || null;

  if (data.session?.access_token) {
    try {
      const authed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      });

      await authed.from("profiles").upsert(
        {
          id: userId,
          email: emailNormalized,
          name,
          contact_number: contact_number || null,
          address: address || null,
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.warn("profile upsert (authed) failed:", e.message);
      
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
