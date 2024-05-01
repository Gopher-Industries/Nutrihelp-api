const supabase = require('../dbConnection.js');

async function getUserProfile(username) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('user_id,username,first_name,last_name,email,mfa_enabled')
            .eq('username', username)
        return data
    } catch (error) {
        throw error;
    }

}

module.exports = getUserProfile;