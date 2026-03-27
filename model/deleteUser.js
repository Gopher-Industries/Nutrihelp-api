const userRepository = require('../repositories/userRepository');

async function deleteUser(user_id) {
    try {
        await userRepository.deleteByUserId(user_id);
    } catch (error) {
        throw error;
    }
}

module.exports = deleteUser;
