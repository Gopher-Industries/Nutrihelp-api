const lookupRepository = require('../repositories/lookupRepository');

async function fetchAllCuisines() {
    try {
        return await lookupRepository.getAllFromTable('cuisines');
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllCuisines;
