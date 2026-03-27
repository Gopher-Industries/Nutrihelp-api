const appointmentRepository = require('../repositories/appointmentRepository');

async function deleteAppointment(user_id, date, time, description) {
    try {
        await appointmentRepository.deleteAppointmentByFields({
            userId: user_id,
            date,
            time,
            description
        });
    } catch (error) {
        throw error;
    }
}

module.exports = deleteAppointment;
