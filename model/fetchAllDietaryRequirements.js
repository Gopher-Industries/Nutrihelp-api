const lookupRepository = require('../repositories/lookupRepository');

async function fetchAllDietaryRequirements() {
    try {
        return await lookupRepository.getAllFromTable('dietary_requirements');
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllDietaryRequirements;
