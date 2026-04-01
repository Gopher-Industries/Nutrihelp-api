const profileRepository = require("../../repositories/mobile/profileRepository");

async function getProfileByEmail(email) {
  return profileRepository.getProfileByEmail(email);
}

module.exports = {
  getProfileByEmail,
};
