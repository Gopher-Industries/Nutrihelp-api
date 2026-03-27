const userRepository = require('../repositories/userRepository');

async function getUserCredentials(email) {
  try {
    return await userRepository.findCredentialsByEmail(email);
  } catch (error) {
    console.error("[getUserCredentials] Credential lookup failed:", error);
    return null;
  }
}

module.exports = getUserCredentials;
