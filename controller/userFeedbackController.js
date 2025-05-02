const { validationResult } = require('express-validator');
let addUserFeedback = require("../model/addUserFeedback.js");

const userfeedback = async (req, res) => {
	try {
		const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
		const { user_id, name, contact_number, email, experience, message } = req.body;

		await addUserFeedback(
			user_id,
			name,
			contact_number,
			email,
			experience,
			message
		);

		res.status(201).json({ message: "Data received successfully!" });
	} catch (error) {
		console.error({ error });
		res.status(500).json({ error: "Internal server error" });
	}
};

module.exports = { userfeedback };
