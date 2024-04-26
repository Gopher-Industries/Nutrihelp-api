const supabase = require('../dbConnection.js');

async function updateUser(username, first_name, last_name, email) {
  console.log(first_name, last_name, email);
  let attributes = {};
  attributes['first_name'] = first_name || undefined;
  attributes['last_name'] = last_name || undefined;
  attributes['email'] = email || undefined;

  try {
    let { data, error } = await supabase
      .from('users')
      .update(attributes)  // e.g { email: "sample@email.com" }
      .eq('username', username)
    return data
  } catch (error) {
      throw error;
  }
}

module.exports = updateUser;