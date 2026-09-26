const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const {
  addAppointment,
  addAppointmentModelV2,
  updateAppointmentModel,
  deleteAppointmentById,
  getAppointmentsByUserId,
} = require('../model/appointmentModel');
const supabase = require('../dbConnection');

function validationFailure(res, errors) {
  return res.status(400).json({ errors: errors.array() });
}

function resolveAppointmentUserId(req) {
  const requestUserId =
    req.body?.userId ||
    req.body?.user_id ||
    req.query?.userId ||
    req.query?.user_id;
  const currentUserId = req.user?.userId;
  const role = String(req.user?.role || '').toLowerCase();

  if (role === 'admin' || role === 'nutritionist') {
    return requestUserId || currentUserId;
  }

  return currentUserId;
}

function internalFailure(res, label, error, context = {}) {
  logger.error(label, { error: error.message, ...context });
  return res.status(500).json({ error: 'Internal server error' });
}

const saveAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationFailure(res, errors);
  }
  const userId = resolveAppointmentUserId(req);
  const { date, time, description } = req.body;
  try {
    await addAppointment(userId, date, time, description);
    res.status(201).json({ message: 'Appointment saved successfully' });
  } catch (error) {
    return internalFailure(res, 'Error saving appointment', error, { userId });
  }
};

const saveAppointmentV2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationFailure(res, errors);
  }
  const userId = resolveAppointmentUserId(req);
  const { title, doctor, type, date, time, location, address, phone, notes, reminder } = req.body;
  try {
    const appointment = await addAppointmentModelV2({
      userId, title, doctor, type, date, time, location, address, phone, notes, reminder,
    });
    res.status(201).json({ message: 'Appointment saved successfully', appointment });
  } catch (error) {
    return internalFailure(res, 'Error saving appointment (V2)', error, { userId });
  }
};

const updateAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationFailure(res, errors);
  }
  const { id } = req.params;
  const userId = resolveAppointmentUserId(req);
  const { title, doctor, type, date, time, location, address, phone, notes, reminder } = req.body;
  try {
    const updatedAppointment = await updateAppointmentModel(id, userId, {
      title, doctor, type, date, time, location, address, phone, notes, reminder,
    });
    if (!updatedAppointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(200).json({ message: 'Appointment updated successfully', appointment: updatedAppointment });
  } catch (error) {
    return internalFailure(res, 'Error updating appointment', error, { appointmentId: id, userId });
  }
};

const delAppointment = async (req, res) => {
  const { id } = req.params;
  const userId = resolveAppointmentUserId(req);
  try {
    const deleted = await deleteAppointmentById(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    return internalFailure(res, 'Error deleting appointment', error, { appointmentId: id, userId });
  }
};

const getAppointments = async (req, res) => {
  const userId = resolveAppointmentUserId(req);
  try {
    const appointments = await getAppointmentsByUserId(userId);
    res.status(200).json(appointments);
  } catch (error) {
    return internalFailure(res, 'Error retrieving appointments', error);
  }
};

const getAppointmentsV2 = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const search = req.query.search || '';
    const userId = resolveAppointmentUserId(req);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .range(from, to);

    if (userId) query = query.eq('user_id', userId);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data: appointments, error, count } = await query;
    if (error) throw error;

    res.status(200).json({
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
      appointments,
    });
  } catch (error) {
    return internalFailure(res, 'Error retrieving appointments (V2)', error);
  }
};

module.exports = {
  saveAppointment,
  saveAppointmentV2,
  updateAppointment,
  delAppointment,
  getAppointments,
  getAppointmentsV2,
};
