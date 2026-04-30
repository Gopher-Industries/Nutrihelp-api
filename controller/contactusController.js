let addContactUsMsg = require("../model/addContactUsMsg.js");
const { validationResult } = require('express-validator');
const { shared } = require('../services');
const logger = require('../utils/logger');

const { createErrorResponse, createSuccessResponse } = shared.apiResponse;

const contactus = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    try {
        await addContactUsMsg(name, email, subject, message);

        return res.status(201).json(createSuccessResponse(null, {
            message: 'Data received successfully!'
        }));
    } catch (error) {
        logger.error('Error saving contact us message', {
            error: error.message,
            email
        });
        return res.status(500).json(createErrorResponse('Internal server error', 'CONTACT_REQUEST_FAILED'));
    }
};

module.exports = { contactus };
