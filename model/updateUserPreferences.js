const preferenceRepository = require('../repositories/preferenceRepository');

async function updateUserPreferences(userId, body) {
    try {
        await preferenceRepository.replaceUserPreferences(userId, body);
    } catch (error) {
        throw error;
    }
}

module.exports = updateUserPreferences;
