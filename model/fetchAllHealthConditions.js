const lookupRepository = require('../repositories/lookupRepository');

async function fetchAllHealthConditions() {
    try {
        return await lookupRepository.getAllFromTable('health_conditions');
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllHealthConditions;
