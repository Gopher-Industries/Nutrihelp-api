//i have changed getUser to get all rows from DB instead of just username, which makes this obsolete, its not being used anywhere anyway
//will probably delete it soon

const supabase = require('../dbConnection.js');

async function getUserCredentials(username) { //removed password from this, not using it anyway
    try {
        let { data, error } = await supabase
            .from('users')
            .select('user_id,username,password,mfa_enabled')
            .eq('username', username)
        return data[0]
    } catch (error) {
        throw error;
    }

}

module.exports = getUserCredentials;