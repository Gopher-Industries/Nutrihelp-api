let updateUser = require("../model/updateUserProfile.js");
let getUser = require("../model/getUserProfile.js");

const updateUserProfile = async (req, res) => {
  try {
    const { username, first_name, last_name, email, contact_number } = req.body;

    // Validate required fields
    if (!username) {
      return res
        .status(400)
        .json({ error: "Username is required", statusCode: 400 });
    }

    // Validate data types and constraints
    if (
      typeof username !== "string" ||
      username.length < 3 ||
      username.length > 30
    ) {
      return res.status(400).json({
        error: "Username must be between 3 and 30 characters",
        statusCode: 400,
      });
    }

    if (
      first_name &&
      (typeof first_name !== "string" || first_name.length > 50)
    ) {
      return res.status(400).json({
        error: "First name must be a string with a maximum of 50 characters",
        statusCode: 400,
      });
    }

    if (last_name && (typeof last_name !== "string" || last_name.length > 50)) {
      return res.status(400).json({
        error: "Last name must be a string with a maximum of 50 characters",
        statusCode: 400,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Invalid email format", statusCode: 400 });
    }

    if (contact_number && !/^\d{10,15}$/.test(contact_number)) {
      return res.status(400).json({
        error: "Contact number must be a valid number between 10 and 15 digits",
        statusCode: 400,
      });
    }

    // Update user profile
    const user_profile = await updateUser(
      username,
      first_name,
      last_name,
      email,
      contact_number
    );

    // Respond with updated profile
    return res.status(200).json({
      message: "User profile updated successfully",
      statusCode: 200,
      user_profile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", statusCode: 500 });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).send("Username is required");
    }

    const userprofile = await getUser(username);

    res.status(200).json(userprofile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { updateUserProfile, getUserProfile };
