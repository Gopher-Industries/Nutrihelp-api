const lookupRepository = require('../repositories/lookupRepository');

async function fetchAllCookingMethods() {
    try {
        return await lookupRepository.getAllFromTable('cooking_methods');
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllCookingMethods;
