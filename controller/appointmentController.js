const supabase = require('../dbConnection');

const normalizeId = (id) => {
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
    return id;
};

exports.getAppointments = async (req, res) => {
function validationFailure(res, errors) {
  return res.status(400).json({ errors: errors.array() });
}

function internalFailure(res, label, error, context = {}) {
  logger.error(label, { error: error.message, ...context });
  return res.status(500).json({ error: 'Internal server error' });
}

// Function to handle saving appointment data
const saveAppointment = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return validationFailure(res, errors);
    }
    // Extract appointment data from the request body
    const { userId, date, time, description } = req.body;

    try {
        // Call the addAppointment model function to insert the data into the database
        const result = await addAppointment(userId, date, time, description);

        // Respond with success message if appointment data is successfully saved
        res.status(201).json({ message: 'Appointment saved successfully' });//, appointmentId: result.id 
    } catch (error) {
        return internalFailure(res, 'Error saving appointment', error, { userId });
    }
};

const saveAppointmentV2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationFailure(res, errors);
  }

  const {
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
  } = req.body;

  try {
    const appointment = await addAppointmentModelV2({
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
    });

    res.status(201).json({
      message: "Appointment saved successfully",
      appointment,
    });
  } catch (error) {
    return internalFailure(res, 'Error saving appointment (V2)', error, { userId });
  }
};

const updateAppointment = async (req,res)=>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationFailure(res, errors);
  }

  const { id } = req.params;

  const {
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
  } = req.body;

    try {
        let userId = req.query.user_id;
        if (!userId) return res.status(400).json({ success: false, error: 'user_id required' });

        userId = normalizeId(userId);

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        res.status(200).json({ success: true, data: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
    res.status(200).json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment,
    });
  } catch (error) {
    return internalFailure(res, 'Error updating appointment', error, { appointmentId: id });
  }
}

const delAppointment = async (req,res)=>{
  const { id } = req.params;

  try {
    const deleted = await deleteAppointmentById(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.status(200).json({
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    return internalFailure(res, 'Error deleting appointment', error, { appointmentId: id });
  }
}

// Function to handle retrieving all appointment data
const getAppointments = async (req, res) => {
    try {
        // Call the appropriate model function to retrieve all appointment data from the database
        // Here, you would call a function from the model layer that fetches all appointments
        // For demonstration purposes, let's assume a function called getAllAppointments() in the model layer
        const appointments = await getAllAppointments();

        // Respond with the retrieved appointment data
        res.status(200).json(appointments);
    } catch (error) {
        return internalFailure(res, 'Error retrieving appointments', error);
    }
};

const getAppointmentsV2 = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const search = req.query.search || "";
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: appointments, error, count } = await getAllAppointmentsV2({ from, to, search });

    if (error) throw error;

    res.status(200).json({
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
      appointments
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
