const appointmentRepository = require("../repositories/appointmentRepository");

async function addAppointment(userId, date, time, description) {
  try {
    return await appointmentRepository.createAppointment({ user_id: userId, date, time, description });
  } catch (error) {
    throw error;
  }
}

async function addAppointmentModelV2({
  userId,
  title,
  doctor,
  type,
  date,
  time,
  location,
  address,
  phone,
  notes,
  reminder,
}) {
  try {
    return await appointmentRepository.createAppointmentV2({
        user_id: userId,
        title,
        doctor,
        type,
        date,
        time,
        location,
        address,
        phone,
        notes,
        reminder,
      });
  } catch (err) {
    throw err;
  }
}

async function updateAppointmentModel(
  id,
  {
    title,
    doctor,
    type,
    date,
    time,
    location,
    address,
    phone,
    notes,
    reminder,
  },
) {
  try {
    return await appointmentRepository.updateAppointmentById(id, {
        title,
        doctor,
        type,
        date,
        time,
        location,
        address,
        phone,
        notes,
        reminder,
      });
  } catch (err) {
    throw err;
  }
}

async function deleteAppointmentById(id) {
  try {
    return await appointmentRepository.deleteAppointmentById(id);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  addAppointment,
  addAppointmentModelV2,
  updateAppointmentModel,
  deleteAppointmentById,
};
