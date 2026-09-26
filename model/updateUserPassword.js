const supabase = require('../dbConnection.js');

async function updateUser(user_id, password) {

  try {
    let { data, error } = await supabase
      .from('users')
      .update({ password: password })
      .eq('user_id', user_id)
      .select('user_id,password')
    return data
  } catch (error) {
      throw error;
  }
}

module.exports = updateUser;