const { validationResult } = require('express-validator');
let addUserFeedback = require("../model/addUserFeedback.js");
const { shared } = require('../services');
const logger = require('../utils/logger');

const { createErrorResponse, createSuccessResponse } = shared.apiResponse;

const userfeedback = async (req, res) => {
	const { user_id, name, contact_number, email, experience, message } = req.body;
	try {
		const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

		await addUserFeedback(
			user_id,
			name,
			contact_number,
			email,
			experience,
			message
		);

		return res.status(201).json(createSuccessResponse(null, {
			message: 'Data received successfully!'
		}));
	} catch (error) {
		logger.error('Error saving user feedback', {
			error: error.message,
			user_id,
			email
		});
		return res.status(500).json(createErrorResponse('Internal server error', 'USER_FEEDBACK_FAILED'));
	}
};

module.exports = { userfeedback };
