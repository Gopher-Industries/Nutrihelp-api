let updateUser = require("../model/updateUserProfile.js");
let getUser = require("../model/getUserProfile.js");

const updateUserProfile = async (req, res) => {
	try {
		if (!req.body.email) {
			return res.status(400).send("Email is required");
		}

		const user_profile = await updateUser(
			req.body.name,
			req.body.first_name,
			req.body.last_name,
			req.body.email,
			req.body.contact_number,
			req.body.address
		);

		res.status(200).json(user_profile);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const getUserProfile = async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) {
			return res.status(400).send("Email is required");
		}

		const userprofile = await getUser(email);

		res.status(200).json(userprofile);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal server error" });
	}
};

module.exports = { updateUserProfile, getUserProfile };
