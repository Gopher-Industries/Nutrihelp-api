const supabase = require('../dbConnection.js');

async function addUser(name, email, password, mfa_enabled, contact_number, address) {
    try {
        let { data, error } = await supabase
            .from('users')
            .insert({ 
              name: name,
              email: email,
              password: password,
              mfa_enabled: mfa_enabled,
              contact_number: contact_number,
              address: address
            })
            .select();
        return data ? data[0] : error;
    } catch (error) {
        throw error;
    }
}

module.exports = addUser;