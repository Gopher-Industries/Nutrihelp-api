// sendVerificationEmail.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config(); // for local .env support

// Step 1: Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Step 2: Main function to call
async function sendVerificationEmail(user_email) {
  // Generate a 64-character token
  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Insert token into Supabase
  const { error } = await supabase
    .from('email_verification_tokens')
    .insert([
      {
        user_email,
        token,
        expires_at,
      },
    ]);

  if (error) {
    console.error("❌ Failed to store token in Supabase:", error);
    return;
  }

  const verificationLink = `http://localhost/verify-email/${token}`;
  console.log(`✅ Verification link (simulated): ${verificationLink}`);
}

// ✅ Export the function for use in routes or server
module.exports = sendVerificationEmail;

// For testing
//sendVerificationEmail("testuser@example.com");

