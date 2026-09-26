const supabase = require('../dbConnection.js');

async function fetchAllHealthConditions() {
    try {
        let { data, error } = await supabase
            .from('health_conditions')
            .select('*');

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllHealthConditions;