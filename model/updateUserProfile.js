const supabase = require('../dbConnection.js');

async function updateUser(username, first_name, last_name, email, contact_number) {
  console.log(first_name, last_name, email, contact_number);
  let attributes = {};
  attributes['first_name'] = first_name || undefined;
  attributes['last_name'] = last_name || undefined;
  attributes['email'] = email || undefined;
  attributes['contact_number'] = contact_number || undefined;

  try {
    let { data, error } = await supabase
      .from('users')
      .update(attributes)  // e.g { email: "sample@email.com" }
      .eq('username', username)
      .select('user_id,username,first_name,last_name,email,contact_number,mfa_enabled')
    return data
  } catch (error) {
      throw error;
  }
}

module.exports = updateUser;