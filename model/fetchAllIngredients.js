const lookupRepository = require('../repositories/lookupRepository');

async function fetchAllIngredients() {
    try {
        return await lookupRepository.getAllFromTable('ingredients', 'id, name, category');
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllIngredients;
