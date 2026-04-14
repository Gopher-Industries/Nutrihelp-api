const supabase = require('../dbConnection.js');
const { encrypt, decrypt } = require('../utils/encryption');

async function addUser(name, email, password, mfa_enabled, contact_number, address) {
    try {
        let { data, error } = await supabase
            .from('users')
            .insert({ 
              name: name,
              email: email,
              password: password,
              mfa_enabled: mfa_enabled,
              contact_number: contact_number ? encrypt(contact_number) : contact_number,
              address: address ? encrypt(address) : address
            })
            .select();
if (data && data.length > 0) {
            const user = data[0];
            if (user.contact_number) user.contact_number = decrypt(user.contact_number);
            if (user.address) user.address = decrypt(user.address);
            return user;
        }
        return error;
    } catch (error) {
        throw error;
    }
}

module.exports = addUser;
