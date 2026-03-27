const lookupRepository = require('../repositories/lookupRepository');

async function fetchAllSpiceLevels() {
    try {
        return await lookupRepository.getAllFromTable('spice_levels');
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllSpiceLevels;
