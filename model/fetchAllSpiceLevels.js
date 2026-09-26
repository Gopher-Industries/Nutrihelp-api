const supabase = require('../dbConnection.js');

async function fetchAllSpiceLevels() {
    try {
        let { data, error } = await supabase
            .from('spice_levels')
            .select('*');

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllSpiceLevels;