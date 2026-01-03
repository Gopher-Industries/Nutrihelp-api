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

async function addAppointmentV2({
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
  reminder
}) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
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
        reminder
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
}


module.exports = {addAppointment,addAppointmentV2};
