const addAppointment = require('../model/addAppointment.js');
const getAllAppointments = require('../model/getAppointments.js');

// Function to handle saving appointment data
const saveAppointment = async (req, res) => {
    // Extract appointment data from the request body
    const { userId, date, time, description } = req.body;

    try {
        // Check if all required fields are present in the request body
        if (!userId || !date || !time || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Call the addAppointment model function to insert the data into the database
        const result = await addAppointment(userId, date, time, description);

        // Respond with success message if appointment data is successfully saved
        res.status(201).json({ message: 'Appointment saved successfully'});//, appointmentId: result.id 
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
        res.json(appointments);
    } catch (error) {
        console.error('Error retrieving appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { saveAppointment, getAppointments };
