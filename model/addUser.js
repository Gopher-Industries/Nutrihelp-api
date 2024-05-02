const supabase = require('../dbConnection.js');

async function addUser(username, password, mfa_enabled) {
    try {
        let { data, error } = await supabase
            .from('users')
            .insert({ username: username, password: password, mfa_enabled: mfa_enabled })
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = addUser;