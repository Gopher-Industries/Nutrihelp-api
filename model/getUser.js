const userRepository = require('../repositories/userRepository');

async function getUser(email) {
    try {
        const user = await userRepository.findByEmail(email);
        return user ? [user] : [];
    } catch (error) {
        throw error;
    }
}

module.exports = getUser;
