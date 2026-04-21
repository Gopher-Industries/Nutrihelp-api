const supabase = require('../dbConnection.js');
const { decrypt } = require('../utils/encryption');

async function getUser(email) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            
            if (data && data.length > 0) {
            data.forEach(user => {
                if (user.contact_number) user.contact_number = decrypt(user.contact_number);
                if (user.address) user.address = decrypt(user.address);
            });
        }
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = getUser;