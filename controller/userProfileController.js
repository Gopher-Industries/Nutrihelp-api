let updateUser = require('../model/updateUserProfile.js')
let getUser = require('../model/getUserProfile.js')

const updateUserProfile = async (req, res) => {
  try {
    const { username, first_name, last_name, email } = req.body;
    if (!username) {
      return res.status(400).send('Username is required');
    }

    const user_profile = await updateUser(username, first_name, last_name, email)

    res.status(200).json(user_profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).send('Username is required');
    }

    const userprofile = await getUser(username);

    res.status(200).json(userprofile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { updateUserProfile, getUserProfile };