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
      .eq('email', email.trim())
      .maybeSingle();

    if (error) {
      console.error("Supabase error in getUserCredentials:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("getUserCredentials failed:", error);
    return null;
  }
}

module.exports = getUserCredentials;