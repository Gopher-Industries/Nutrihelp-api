let updateUserProfile = require('../model/updateUserProfile.js')

const userProfile = async (req, res) => {
  try {
    const { username, first_name, last_name, email } = req.body;
    if (!username) {
      return res.status(400).send('Username is required');
    }    
    
    await updateUserProfile(username, first_name, last_name, email )

    res.status(200).json({ message: 'Data received successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { userProfile };