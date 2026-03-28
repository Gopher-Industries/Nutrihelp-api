const supabase = require('../dbConnection.js');

async function fetchAllAllergies() {
    try {
        let { data, error } = await supabase
            .from('allergies')
            .select('*');

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllAllergies;