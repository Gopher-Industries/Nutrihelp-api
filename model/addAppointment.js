const supabase = require('../dbConnection.js');

async function addAppointment(userId, date, time, description) {
    try {
        let { data, error } = await supabase
            .from('appointments')
            .insert({ user_id: userId, date, time, description })
        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = addAppointment;
