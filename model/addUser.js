const supabase = require('../dbConnection.js');

async function addUser(username, password, mfa_enabled, contact_number) {
    try {
        let { data, error } = await supabase
            .from('users')
            .insert({ username: username, password: password, mfa_enabled: mfa_enabled, contact_number: contact_number  })
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = addUser;