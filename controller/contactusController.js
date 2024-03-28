// dbClient = require('../dbConnection.js');

const contactus = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name) {
      return res.status(400).send('Name is required');
    }
  
    if (!email) {
      return res.status(400).send('Email is required');
    }

    if (!message) {
      return res.status(400).send('Message is required');
    }      
    //TODO Connect to DB to add contact records

    res.status(201).json({ message: 'Data received successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { contactus };