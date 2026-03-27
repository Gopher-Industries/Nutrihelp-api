const preferenceRepository = require('../repositories/preferenceRepository');

async function fetchUserPreferences(userId) {
    try {
        return await preferenceRepository.fetchUserPreferences(userId);
    } catch (error) {
        throw error;
    }
}

module.exports = fetchUserPreferences;
