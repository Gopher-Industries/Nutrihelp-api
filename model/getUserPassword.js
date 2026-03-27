const userRepository = require('../repositories/userRepository');

async function getUserProfile(user_id) {
    try {
        return await userRepository.findPasswordByUserId(user_id);
    } catch (error) {
        throw error;
    }

}

module.exports = getUserProfile;
