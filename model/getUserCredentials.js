const supabase = require('../dbConnection.js');

async function getUserCredentials(username, password) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('user_id,username,password')
            .eq('username', username)
        return data[0]
    } catch (error) {
        throw error;
    }

}

module.exports = getUserCredentials;