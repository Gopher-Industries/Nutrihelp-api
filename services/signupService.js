const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const logLoginEvent = require('../Monitor_&_Logging/loginLogger');
const getUser = require('../model/getUser');
const addUser = require('../model/addUser');
const supabase = require('../database/supabaseClient');
const { ServiceError } = require('./serviceError');

function normalizeIp(rawIp) {
  const ip = rawIp || '';
  return ip === '::1' ? '127.0.0.1' : ip;
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password || '');
}

async function safeLog(payload) {
  try {
    await logLoginEvent(payload);
  } catch (error) {
    console.warn('log error:', error.message);
  }
}

class SignupService {
  async signup({ name, email, password, contactNumber, address, ip, userAgent }) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedIp = normalizeIp(ip);

    if (!isStrongPassword(password)) {
      throw new ServiceError(
        400,
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
        { code: 'WEAK_PASSWORD' }
      );
    }

    try {
      const authUser = await this.signupAuthTable({
        name,
        email: normalizedEmail,
        password,
        contactNumber,
        address,
        ip: normalizedIp,
        userAgent
      });

      await this.signupPublicTable({
        userUuid: authUser.user_uuid,
        name,
        email: normalizedEmail,
        password,
        contactNumber,
        address,
        ip: normalizedIp,
        userAgent
      });

      return {
        statusCode: 201,
        body: {
          message: 'User created successfully'
        }
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      await safeLog({
        userId: null,
        eventType: 'SIGNUP_FAILED',
        ip: normalizedIp,
        userAgent,
        details: {
          reason: 'Internal server error',
          error_message: error.message,
          email: normalizedEmail
        }
      });

      throw new ServiceError(500, 'Internal server error');
    }
  }

  async signupPublicTable({ userUuid, name, email, password, contactNumber, address, ip, userAgent }) {
    const existingUsers = await getUser(email);
    if (existingUsers.length > 0) {
      await safeLog({
        userId: null,
        eventType: 'EXISTING_USER',
        ip,
        userAgent,
        details: {
          reason: 'User already exists',
          email
        }
      });

      throw new ServiceError(400, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await addUser(name, email, hashedPassword, true, contactNumber, address);

    await safeLog({
      userId: userUuid,
      eventType: 'SIGNUP_SUCCESS',
      ip,
      userAgent,
      details: { email }
    });
  }

  async signupAuthTable({ name, email, password, contactNumber, address, ip, userAgent }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          contact_number: contactNumber || null,
          address: address || null
        },
        emailRedirectTo: process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/login` : undefined
      }
    });

    if (data?.session) {
      await supabase.auth.signOut();
    }

    if (error) {
      const message = (error.message || '').toLowerCase();

      if (message.includes('already') && message.includes('registered')) {
        await safeLog({
          userId: null,
          eventType: 'EXISTING_USER',
          ip,
          userAgent,
          details: { email }
        });
        throw new ServiceError(400, 'User already exists');
      }

      if (message.includes('password')) {
        throw new ServiceError(400, error.message);
      }

      throw new ServiceError(400, error.message || 'Unable to create user');
    }

    const userId = data.user?.id || null;

    if (data.session?.access_token) {
      try {
        const authed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
        });

        await authed.from('profiles').upsert(
          {
            id: userId,
            email,
            name,
            contact_number: contactNumber || null,
            address: address || null
          },
          { onConflict: 'id' }
        );
      } catch (profileError) {
        console.warn('profile upsert (authed) failed:', profileError.message);
      }
    }

    return {
      user_uuid: userId,
      message: 'User created successfully. Please check your email to verify your account.'
    };
  }
}

module.exports = new SignupService();
