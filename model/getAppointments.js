const supabase = require('../dbConnection.js');

async function getAllAppointments() {
    try {
        // Fetch all appointment data from the appointments table
        let { data, error } = await supabase
            .from('appointments')
            .select('*'); // Select all columns

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = getAllAppointments;
