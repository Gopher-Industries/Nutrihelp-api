let addUserFeedback = require('../model/addUserFeedback.js')

const userfeedback = async (req, res) => {
  try {
    const { name, contact_number, email, experience, message } = req.body;

    // Validate required fields
    if (!name) {
      return res
        .status(400)
        .json({ error: "Name is required", statusCode: 400 });
    }
    if (!email) {
      return res
        .status(400)
        .json({ error: "Email is required", statusCode: 400 });
    }
    if (!experience) {
      return res
        .status(400)
        .json({ error: "Experience is required", statusCode: 400 });
    }
    if (!message) {
      return res
        .status(400)
        .json({ error: "Message is required", statusCode: 400 });
    }

    // Validate data types and constraints
    if (typeof name !== "string" || name.length < 2 || name.length > 50) {
      return res
        .status(400)
        .json({
          error: "Name must be between 2 and 50 characters",
          statusCode: 400,
        });
    }

    if (contact_number && !/^\d{10,15}$/.test(contact_number)) {
      return res
        .status(400)
        .json({
          error:
            "Contact number must be a valid number between 10 and 15 digits",
          statusCode: 400,
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Invalid email format", statusCode: 400 });
    }

    if (
      typeof experience !== "string" ||
      experience.length < 5 ||
      experience.length > 200
    ) {
      return res
        .status(400)
        .json({
          error: "Experience must be between 5 and 200 characters",
          statusCode: 400,
        });
    }

    if (
      typeof message !== "string" ||
      message.length < 10 ||
      message.length > 500
    ) {
      return res
        .status(400)
        .json({
          error: "Message must be between 10 and 500 characters",
          statusCode: 400,
        });
    }

    // Save feedback
    await addUserFeedback(name, contact_number, email, experience, message);

    // Send success response
    return res
      .status(201)
      .json({ message: "Feedback received successfully!", statusCode: 201 });
  } catch (error) {
    console.error("Error processing feedback:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", statusCode: 500 });
  }
};


module.exports = { userfeedback };