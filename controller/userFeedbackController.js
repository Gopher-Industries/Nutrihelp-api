let addUserFeedback = require('../model/addUserFeedback.js')

const userfeedback = async (req, res) => {
  try {
    const { name, contact_number, email, experience, comments } = req.body;
    if (!name) {
      return res.status(400).send('Name is required');
    }

    if (!email) {
      return res.status(400).send('Email is required');
    }

    if (!experience) {
      return res.status(400).send('Experience is required');
    }
    
    if (!comments) {
      return res.status(400).send('Comments is required');
    }
    
    await addUserFeedback(name, contact_number, email, experience, comments)

    res.status(201).json({ message: 'Data received successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { userfeedback };