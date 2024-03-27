const supabase = require('../dbConnection.js');

async function addUser(username, password) {
    try {
        let { data, error } = await supabase
            .from('users')
            .insert({ username: username, password: password })
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = addUser;