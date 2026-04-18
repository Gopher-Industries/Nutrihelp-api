const supabase = require('../dbConnection.js');

async function fetchAllDietaryRequirements() {
    try {
        let { data, error } = await supabase
            .from('dietary_requirements')
            .select('*');

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllDietaryRequirements;