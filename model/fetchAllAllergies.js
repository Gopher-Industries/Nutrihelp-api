const lookupRepository = require('../repositories/lookupRepository');

async function fetchAllAllergies() {
    try {
        return await lookupRepository.getAllFromTable('allergies');
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllAllergies;
