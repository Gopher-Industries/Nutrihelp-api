let addContactUsMsg = require("../model/addContactUsMsg.js");
const { validationResult } = require('express-validator');
const { contactusValidator } = require('../validators/contactusValidator.js');

const contactus = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    try {
        await addContactUsMsg(name, email, subject, message);

        return res.status(201).json({ message: 'Data received successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { contactus };