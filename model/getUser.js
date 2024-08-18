const supabase = require('../dbConnection.js');

async function getUser(username) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('*') //now gets full user row instead of just username
            .eq('username', username)
        return data
    } catch (error) {
        throw error;
    }

}

module.exports = getUser;