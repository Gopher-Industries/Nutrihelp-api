const supabase = require('../dbConnection.js');

async function fetchAllCuisines() {
    try {
        let { data, error } = await supabase
            .from('cuisines')
            .select('*');

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllCuisines;