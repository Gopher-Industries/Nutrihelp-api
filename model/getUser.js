const supabase = require('../dbConnection.js');
const { decrypt } = require('../services/encryptionService');

async function getUser(email) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            
            if (data && data.length > 0) {
            data.forEach(user => {
                if (user.contact_number) {
                    const encryptedObj = JSON.parse(user.contact_number);
                    user.contact_number = decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.authTag);
                }
                if (user.address) {
                    const encryptedObj = JSON.parse(user.address);
                    user.address = decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.authTag);
                }
            });
        }
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = getUser;