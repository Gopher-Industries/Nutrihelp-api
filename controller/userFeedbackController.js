let addUserFeedback = require("../model/addUserFeedback.js");

const userfeedback = async (req, res) => {
	try {
		const { name, contact_number, email, experience, message } = req.body;
		if (!name) {
			return res.status(400).send({ error: "Name is required" });
		}

		if (!email) {
			return res.status(400).send({ error: "Email is required" });
		}

		if (!experience) {
			return res.status(400).send({ error: "Experience is required" });
		}

		if (!message) {
			return res.status(400).send({ error: "Message is required" });
		}

		await addUserFeedback(name, contact_number, email, experience, message);

		res.status(201).json({ message: "Data received successfully!" });
	} catch (error) {
		console.error({ error });
		res.status(500).json({ error: "Internal server error" });
	}
};

module.exports = { userfeedback };
