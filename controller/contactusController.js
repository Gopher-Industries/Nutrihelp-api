let addContactUsMsg = require("../model/addContactUsMsg.js");

const contactus = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate presence of required fields
    if (!name || !email || !subject || !message) {
      return res
        .status(400)
        .json({
          error: "All fields (name, email, subject, message) are required",
        });
    }

    // Validate data types
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "Invalid data type for one or more fields" });
    }

    // Validate name length (e.g., between 3 and 50 characters)
    if (name.length < 3 || name.length > 50) {
      return res
        .status(400)
        .json({ error: "Name must be between 3 and 50 characters" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate subject length (e.g., between 5 and 100 characters)
    if (subject.length < 5 || subject.length > 100) {
      return res
        .status(400)
        .json({ error: "Subject must be between 5 and 100 characters" });
    }

    // Validate message length (e.g., between 10 and 1000 characters)
    if (message.length < 10 || message.length > 1000) {
      return res
        .status(400)
        .json({ error: "Message must be between 10 and 1000 characters" });
    }

    // Proceed to save the contact us message
    await addContactUsMsg(name, email, subject, message);

    return res.status(201).json({ message: "Data received successfully!" });
  } catch (error) {
    console.error("Error processing contact us request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = { contactus };