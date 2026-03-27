const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function createAppointment(payload) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create appointment', error);
  }
}

async function createAppointmentV2(payload) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create appointment v2', error);
  }
}

async function updateAppointmentById(id, payload) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      return null;
    }
    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to update appointment', error, { id });
  }
}

async function deleteAppointmentById(id) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      return null;
    }
    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete appointment by id', error, { id });
  }
}

async function deleteAppointmentByFields({ userId, date, time, description }) {
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
      .eq('time', time)
      .eq('description', description);

    if (error) throw error;
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete appointment by fields', error, { userId, date, time });
  }
}

async function getAllAppointments() {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load appointments', error);
  }
}

async function getAppointmentsPage({ from = 0, to = 9, search = '' } = {}) {
  try {
    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .range(from, to);

    if (search) {
      query = query.or(`title.ilike.%${search}%,doctor.ilike.%${search}%,type.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  } catch (error) {
    throw wrapRepositoryError('Failed to load paged appointments', error);
  }
}

module.exports = {
  createAppointment,
  createAppointmentV2,
  deleteAppointmentByFields,
  deleteAppointmentById,
  getAllAppointments,
  getAppointmentsPage,
  updateAppointmentById
};
