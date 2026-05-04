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

function internalFailure(res, label, error, context = {}) {
  logger.error(label, { error: error.message, ...context });
  return res.status(500).json({ error: 'Internal server error' });
}

const saveAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationFailure(res, errors);
  }
  const { userId, date, time, description } = req.body;
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
  const { userId, title, doctor, type, date, time, location, address, phone, notes, reminder } = req.body;
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
  const { title, doctor, type, date, time, location, address, phone, notes, reminder } = req.body;
  try {
    const updatedAppointment = await updateAppointmentModel(id, {
      title, doctor, type, date, time, location, address, phone, notes, reminder,
    });
    res.status(200).json({ message: 'Appointment updated successfully', appointment: updatedAppointment });
  } catch (error) {
    return internalFailure(res, 'Error updating appointment', error, { appointmentId: id });
  }
};

const delAppointment = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await deleteAppointmentById(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    return internalFailure(res, 'Error deleting appointment', error, { appointmentId: id });
  }
};

const getAppointments = async (req, res) => {
  const userId = req.query.userId || req.user?.id || req.user?.user_id;
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
    const userId = req.query.userId || req.user?.id || req.user?.user_id;
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
