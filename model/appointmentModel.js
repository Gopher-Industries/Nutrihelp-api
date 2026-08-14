const supabase = require('../dbConnection');

async function getAppointmentsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
}

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
  status = "scheduled",
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
        status,
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
  userId,
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
    status,
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
        ...(status !== undefined && { status }),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (err) {
    throw err;
  }
}


module.exports = {
  getAppointmentsByUserId,
  addAppointment,
  addAppointmentModelV2,
  updateAppointmentModel,
};
