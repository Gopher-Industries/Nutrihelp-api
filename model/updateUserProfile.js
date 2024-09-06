const supabase = require('../dbConnection.js');

async function updateUser(name, first_name, last_name, email, contact_number, address) {
  let attributes = {};
  attributes['name'] = name || undefined;
  attributes['first_name'] = first_name || undefined;
  attributes['last_name'] = last_name || undefined;
  attributes['email'] = email || undefined;
  attributes['contact_number'] = contact_number || undefined;
  attributes['address'] = address || undefined;

  try {
    let { data, error } = await supabase
      .from('users')
      .update(attributes)  // e.g { email: "sample@email.com" }
      .eq('email', email)
      .select('user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address')
    return data
  } catch (error) {
      throw error;
  }
}

module.exports = updateUser;