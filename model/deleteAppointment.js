const supabase = require('../dbConnection.js');

async function deleteAppointment(user_id, date, time, description) {
    try {
        let { error } = await supabase
            .from('appointments')
            .delete()
            .eq('user_id', user_id)
            .eq('date', date)
            .eq('time', time)
            .eq('description', description);
        if (error) {
            throw new Error('Error deleting appointment')
        }
    } catch (error) {
        throw error;
    }
}

module.exports = deleteAppointment;