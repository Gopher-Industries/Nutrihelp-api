const supabase = require('../dbConnection.js');

async function addMfaToken(userId, token) {
  try {
    const currentDate = new Date();
    const expiryDate = new Date(currentDate.getTime() + 10 * 60000); // 10 minutes

    // Ensure userId is stored as integer
    const parsedUserId = parseInt(userId, 10);

    const { data, error } = await supabase
      .from('mfatokens')
      .insert({
        user_id: parsedUserId,
        token,
        expiry: expiryDate.toISOString(),
        is_used: false
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding MFA token:", error);
    throw error;
  }
}

async function verifyMfaToken(userId, token) {
  try {
    // Ensure userId is treated as integer here too
    const parsedUserId = parseInt(userId, 10);

    const { data, error } = await supabase
      .from('mfatokens')
      .select('id, token, expiry, is_used')
      .eq('user_id', parsedUserId)
      .eq('token', token)
      .eq('is_used', false)
      .order('expiry', { ascending: false })
      .limit(1);

    if (error) throw error;

    const mfaToken = data?.[0];
    if (!mfaToken) {
      console.log("❌ No valid token found for user:", parsedUserId, "token:", token);
      return false;
    }

    // Check expiry BEFORE updating
    const now = new Date();
    const expiryDate = new Date(mfaToken.expiry);
    if (now > expiryDate) {
      console.log("❌ Token expired. Expiry:", expiryDate, "Now:", now);
      return false;
    }

    // Mark token as used
    await supabase
      .from('mfatokens')
      .update({ is_used: true })
      .eq('id', mfaToken.id);

    console.log("✅ Token validated successfully for user:", parsedUserId);
    return true;
  } catch (error) {
    console.error("Error verifying MFA token:", error);
    throw error;
  }
}

module.exports = { addMfaToken, verifyMfaToken };