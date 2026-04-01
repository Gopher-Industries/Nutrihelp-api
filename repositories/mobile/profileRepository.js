const getUserProfile = require("../../model/getUserProfile");

async function getProfileByEmail(email) {
  const profiles = await getUserProfile(email);
  return Array.isArray(profiles) ? profiles[0] || null : profiles || null;
}

module.exports = {
  getProfileByEmail,
};
