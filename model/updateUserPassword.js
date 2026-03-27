const userRepository = require('../repositories/userRepository');

async function updateUser(user_id, password) {

  try {
    return await userRepository.updatePasswordByUserId(user_id, password);
  } catch (error) {
      throw error;
  }
}

module.exports = updateUser;
