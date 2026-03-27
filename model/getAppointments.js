const appointmentRepository = require('../repositories/appointmentRepository');

async function getAllAppointments() {
    try {
        // Fetch all appointment data from the appointments table
        return await appointmentRepository.getAllAppointments();
    } catch (error) {
        throw error;
    }
}

async function getAllAppointmentsV2({ from = 0, to = 9, search = "" } = {}) {
  try {
    return await appointmentRepository.getAppointmentsPage({ from, to, search });
  } catch (err) {
    throw err;
  }
}




module.exports = {getAllAppointments, getAllAppointmentsV2};
