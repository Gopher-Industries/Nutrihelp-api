const fetchUserPreferences = require("../model/fetchUserPreferences");
const logger = require('../utils/logger');
const updateUserPreferences = require("../model/updateUserPreferences");

const getUserPreferences = async (req, res) => {
	try {
		const userId = req.user.userId;
		if (!userId) {
			return res.status(400).json({ error: "User ID is required" });
		}

		const userPreferences = await fetchUserPreferences(userId);
		if (!userPreferences || userPreferences.length === 0) {
			return res
				.status(404)
				.json({ error: "User preferences not found" });
		}

		return res.status(200).json(userPreferences);
	} catch (error) {
		logger.error('Error fetching user preferences', { error: error.message, userId: req.user?.userId });
		return res.status(500).json({ error: "Internal server error" });
	}
};

const postUserPreferences = async (req, res) => {
	try {
		const { user } = req.body;

		await updateUserPreferences(user.userId, req.body);
		return res
			.status(204)
			.json({ message: "User preferences updated successfully" });
	} catch (error) {
		logger.error('Error updating user preferences', { error: error.message, userId: req.body.user?.userId });
		return res.status(500).json({ error: "Internal server error" });
	}
};

module.exports = {
	getUserPreferences,
	postUserPreferences,
};
