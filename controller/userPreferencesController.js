const fetchUserPreferences = require("../model/fetchUserPreferences");
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
		console.error(error);
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
		console.error(error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

module.exports = {
	getUserPreferences,
	postUserPreferences,
};
