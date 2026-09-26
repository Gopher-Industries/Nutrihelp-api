const supabase = require('../dbConnection.js');

async function fetchAllCookingMethods() {
    try {
        let { data, error } = await supabase
            .from('cooking_methods')
            .select('*');

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllCookingMethods;