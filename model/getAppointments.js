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

async function getAllAppointmentsV2({ from = 0, to = 9, search = "" } = {}) {
  try {
    let query = supabase
      .from("appointments")
      .select("*", { count: "exact" })
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .range(from, to);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,doctor.ilike.%${search}%,type.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return { data, count };
  } catch (err) {
    throw err;
  }
}




module.exports = {getAllAppointments, getAllAppointmentsV2};
