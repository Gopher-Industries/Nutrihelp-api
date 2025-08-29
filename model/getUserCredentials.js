const supabase = require('../dbConnection.js');

async function getUserCredentials(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        password,
        mfa_enabled,
        role_id,
        user_roles (
          id,
          role_name
        )
      `)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Supabase error in getUserCredentials:", error.message || error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("getUserCredentials failed:", err.message);
    return null;
  }
}

module.exports = getUserCredentials;