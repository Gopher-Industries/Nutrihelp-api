const addAppointment = require('../model/addAppointment.js');
const getAllAppointments = require('../model/getAppointments.js');
const { validationResult } = require('express-validator');
const { appointmentValidation } = require('../validators/appointmentValidator.js');

// Function to handle saving appointment data
const saveAppointment = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // Extract appointment data from the request body
    const { userId, date, time, description } = req.body;

    try {
        // Call the addAppointment model function to insert the data into the database
        const result = await addAppointment(userId, date, time, description);

        // Respond with success message if appointment data is successfully saved
        res.status(201).json({ message: 'Appointment saved successfully' });//, appointmentId: result.id 
    } catch (error) {
        console.error('Error saving appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

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
        console.error('Error retrieving appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { saveAppointment, getAppointments };
