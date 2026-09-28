const supabase = require('../dbConnection.js');
const { encrypt, decrypt } = require('../services/encryptionService');

async function addUser(name, email, password, mfa_enabled, contact_number, address) {
    try {
        let { data, error } = await supabase
            .from('users')
            .insert({ 
              name: name,
              email: email,
              password: password,
              mfa_enabled: mfa_enabled,
              contact_number: contact_number ? JSON.stringify(await encrypt(contact_number)) : contact_number,
              address: address ? JSON.stringify(await encrypt(address)) : address
            })
            .select();
if (data && data.length > 0) {
            const user = data[0];
            if (user.contact_number) {
                const encryptedObj = JSON.parse(user.contact_number);
                user.contact_number = await decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.authTag);
            }
            if (user.address) {
                const encryptedObj = JSON.parse(user.address);
                user.address = await decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.authTag);
            }
            return user;
        }
        return error;
    } catch (error) {
        throw error;
    }
}

module.exports = addUser;
