const userRepository = require('../repositories/userRepository');

async function addUser(name, email, password, mfa_enabled, contact_number, address) {
    try {
        return await userRepository.createUser({
          name,
          email,
          password,
          mfaEnabled: mfa_enabled,
          contactNumber: contact_number,
          address
        });
    } catch (error) {
        throw error;
    }
}

module.exports = addUser;
