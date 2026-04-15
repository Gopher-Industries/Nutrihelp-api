const supabase = require("../dbConnection.js");

async function addAppointment(userId, date, time, description) {
  try {
    let { data, error } = await supabase
      .from("appointments")
      .insert({ user_id: userId, date, time, description });
    return data;
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
        reminder,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from("appointments")
      .update({
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
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
}

async function deleteAppointmentById(id) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
